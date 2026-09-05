import { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Gavel, ArrowRight, Trophy, Image as ImageIcon,
  Users, Zap, ShoppingBag, Crown, Info, MousePointerClick, Wallet,
  Calendar, Clock, CheckCircle, AlertCircle, PartyPopper,
} from 'lucide-react';
import { useAuctionDetail, useAuctions, useIranToday, useServerTime, useProcessDirectPurchase, useAuctionMedia } from '@/hooks/useAuction';
import { useToast } from '@/providers/useToast';
import { formatToman, toPersianDigits } from '@/lib/persian';
import { formatTime, formatJalaliDate } from '@/lib/jalali';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { AuctionGallery } from '@/components/auction/AuctionGallery';
import { ClickButton } from '@/components/auction/ClickButton';
import { LastFiveClickers } from '@/components/auction/LastFiveClickers';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { Modal } from '@/components/ui/Modal';
import { Spinner } from '@/components/ui/Spinner';
import type { BidHistoryEntry, LastFiveClicker, AuctionDetail, Auction } from '@/types';

// ─── Compact upcoming auction card ─────────────────────────
function UpcomingAuctionCard({ auction, label }: { auction: Auction; label: string }) {
  return (
    <Link to={`/auctions/${auction.id}`} className="block group animate-fade-in">
      <Card hover className="p-0 overflow-hidden h-full">
        <div className="aspect-[16/7] bg-gradient-to-br from-neutral-200 to-neutral-400 relative">
          {auction.imageUrl ? (
            <img src={auction.imageUrl} alt={auction.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-neutral-700" />
            </div>
          )}
          <div className="absolute top-2.5 right-2.5">
            <Badge tone="warning" variant="soft">{label}</Badge>
          </div>
        </div>
        <div className="p-3.5 space-y-2">
          <h3 className="text-sm font-bold text-neutral-800 truncate">{auction.productName || auction.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="w-3 h-3" />
            <span>شروع: {formatTime(new Date(auction.startsAt))}</span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <p className="text-[10px] text-neutral-600">قیمت شروع</p>
              <p className="text-xs font-bold text-primary-700">{formatToman(auction.startingPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-600">هر کلیک</p>
              <p className="text-xs font-bold text-warning-700">{formatToman(auction.clickCost)}</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function AuctionDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isLoading, error } = useAuctionDetail(id);
  const { data: auctionMedia } = useAuctionMedia(id);
  const { data: auctions } = useAuctions();
  const { data: today } = useIranToday();
  const { data: serverTimeData } = useServerTime();
  const [isExpired, setIsExpired] = useState(false);
  const [finishingTimeout, setFinishingTimeout] = useState(false);
  const [showDirectPurchase, setShowDirectPurchase] = useState(false);
  const [purchaseResult, setPurchaseResult] = useState<{ success: boolean; newBalance?: number; error?: string } | null>(null);
  const toast = useToast();
  const directPurchaseMutation = useProcessDirectPurchase();

  const serverTimeOffset = serverTimeData
    ? new Date(serverTimeData.serverTime).getTime() - Date.now()
    : 0;

  const handleExpire = useCallback(() => {
    setIsExpired(true);
    setTimeout(() => setFinishingTimeout(true), 30_000);
  }, []);

  if (isLoading) return <FullPageSpinner />;

  if (error) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="خطا در بارگذاری مزایده"
          description="لطفاً دوباره تلاش کنید"
        />
      </div>
    );
  }

  if (!data || !data.auction) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="مزایده پیدا نشد"
          description="مزایده مورد نظر وجود ندارد یا حذف شده است"
        />
      </div>
    );
  }

  const { auction, lastFiveClickers, userClickCount, userTotalSpent } = data as AuctionDetail;
  const clickers = (lastFiveClickers as LastFiveClicker[]) || [];
  const bidHistory = (data.bids as BidHistoryEntry[]) || [];
  const winner = auction.winnerUserId
    ? bidHistory.find((b) => b.isWinning)
    : null;
  const isFinishing = isExpired && !finishingTimeout && (auction.status === 'live' || auction.status === 'ending');
  const isLive = (auction.status === 'live' || auction.status === 'ending') && (!isExpired || finishingTimeout);
  const isEnding = auction.status === 'ending' && (!isExpired || finishingTimeout);
  const isEnded = auction.status === 'ended';

  const userHasClicked = userClickCount > 0;
  const isUserLastClicker = clickers.length > 0 && clickers[0]?.isOwn;
  const isLosingParticipant = isEnded && userHasClicked && !winner?.isOwnBid;

  const directPurchaseCredit = userTotalSpent;
  const directPurchaseRemaining = auction.originalPrice
    ? Math.max(0, auction.originalPrice - directPurchaseCredit)
    : 0;

  // Upcoming auctions
  const todayDate = today ?? new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const dayAfterDate = new Date(todayDate);
  dayAfterDate.setDate(dayAfterDate.getDate() + 2);
  const dayAfterStr = dayAfterDate.toISOString().split('T')[0];

  const tomorrowAuctions = (auctions || []).filter(
    (a) => a.auctionDate === tomorrowStr && a.status === 'scheduled'
  );
  const dayAfterAuctions = (auctions || []).filter(
    (a) => a.auctionDate === dayAfterStr && a.status === 'scheduled'
  );

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-2xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <Link to="/" className="hover:text-neutral-600 transition-colors">میدان شهر</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <Link to="/auctions" className="hover:text-neutral-600 transition-colors">تالار مزایده</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="text-neutral-600 truncate">{auction.title}</span>
      </nav>

      {/* ═══ ONE COHERENT AUCTION CARD ═══ */}
      <Card className="p-0 overflow-hidden">
        {/* Live indicator bar */}
        {isLive && (
          <div className={`flex items-center justify-center gap-2 py-1.5 text-xs font-medium ${
            isEnding
              ? 'bg-error-50 text-error-700'
              : 'bg-primary-50 text-primary-700'
          }`}>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-current" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-current" />
            </span>
            مزایده آنلاین — {isEnding ? 'آخرین ثانیه‌ها' : 'در حال برگزاری'}
          </div>
        )}
        {isEnded && (
          <div className="flex items-center justify-center gap-2 py-1.5 text-xs font-medium bg-neutral-100/50 text-neutral-500">
            <Trophy className="w-3 h-3" />
            مزایده به پایان رسید
          </div>
        )}
        {isFinishing && (
          <div className="flex items-center justify-center gap-2 py-1.5 text-xs font-medium bg-warning-50 text-warning-700">
            <Clock className="w-3 h-3" />
            در حال پایان مزایده
          </div>
        )}

        {/* Product image — auction gallery */}
        <div className="relative shrink-0">
          <AuctionGallery
            media={auctionMedia ?? []}
            fallbackImageUrl={auction.imageUrl}
            title={auction.title}
          />
          {auction.extensionUsed && (
            <div className="absolute bottom-3 right-3">
              <Badge tone="warning" variant="outline">
                <Zap className="w-3 h-3" />
                تمدید ۱۰ ثانیه‌ای
              </Badge>
            </div>
          )}
        </div>

        {/* Product name + description — shown once */}
        <div className="px-5 pt-4 pb-3 border-b border-neutral-200">
          <h1 className="text-lg font-extrabold text-neutral-800 mb-0.5">{auction.productName || auction.title}</h1>
          <p className="text-sm text-neutral-500 leading-relaxed line-clamp-2">
            {auction.description || 'توضیحاتی برای این مزایده ثبت نشده است.'}
          </p>
        </div>

        {/* ─── LIVE AUCTION AREA ─── */}
        {isLive && (
          <div className="px-5 py-4">
            {/* Countdown */}
            <div className="text-center mb-4">
              <p className="text-xs text-neutral-500 mb-2">زمان باقیمانده</p>
              <CountdownTimer
                startsAt={auction.startsAt}
                endsAt={auction.endsAt}
                serverTimeOffset={serverTimeOffset}
                onExpire={handleExpire}
                variant="hero"
              />
            </div>

            {/* Current price — single prominent display */}
            <div className="text-center py-3 border-y border-neutral-200 mb-4">
              <p className="text-xs text-neutral-500 mb-1">قیمت فعلی مزایده</p>
              <p className="text-3xl font-extrabold text-primary-700 font-num tracking-tight">
                {formatToman(auction.currentPrice)}
              </p>
            </div>

            {/* Stats — single row, compact */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-neutral-500 mb-0.5">
                  <MousePointerClick className="w-3 h-3" />
                  <span className="text-sm font-bold text-neutral-800">{toPersianDigits(auction.clickCount)}</span>
                </div>
                <p className="text-[10px] text-neutral-600">کلیک‌ها</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-neutral-500 mb-0.5">
                  <Users className="w-3 h-3" />
                  <span className="text-sm font-bold text-neutral-800">{toPersianDigits(auction.participantCount)}</span>
                </div>
                <p className="text-[10px] text-neutral-600">شرکت‌کنندگان</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-neutral-500 mb-0.5">
                  <Zap className="w-3 h-3" />
                  <span className="text-sm font-bold text-neutral-600">{toPersianDigits(auction.clickIncrement.toLocaleString('en-US'))}</span>
                </div>
                <p className="text-[10px] text-neutral-600">افزایش هر کلیک</p>
              </div>
            </div>

            {/* User's own participation status — compact inline */}
            {userHasClicked && (
              <div className={`p-2.5 rounded-lg border mb-3 ${
                isUserLastClicker
                  ? 'bg-success-50 border-success-500/20'
                  : 'bg-warning-50 border-warning-500/20'
              }`}>
                <div className="flex items-center gap-2 mb-1.5">
                  {isUserLastClicker ? (
                    <>
                      <Crown className="w-4 h-4 text-success-600 shrink-0" />
                      <p className="text-xs font-medium text-success-700">
                        شما آخرین کلیک‌کننده هستید
                      </p>
                    </>
                  ) : (
                    <>
                      <Info className="w-4 h-4 text-warning-600 shrink-0" />
                      <p className="text-xs font-medium text-warning-700">
                        کلیک دیگری بعد از شما ثبت شده است
                      </p>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-4 text-xs text-neutral-500">
                  <span>کلیک‌های شما: <span className="font-medium text-neutral-600">{toPersianDigits(userClickCount)}</span></span>
                  <span>مبلغ مصرف‌شده: <span className="font-medium text-neutral-600">{formatToman(userTotalSpent)}</span></span>
                </div>
              </div>
            )}

            {/* Primary action — کلیک کن */}
            <ClickButton auction={auction} />
          </div>
        )}

        {/* ─── FINISHING — TIMER EXPIRED, AWAITING BACKEND FINALIZATION ─── */}
        {isFinishing && (
          <div className="px-5 py-8 text-center">
            <Spinner className="w-6 h-6 mx-auto mb-3 text-primary-600" />
            <p className="text-sm text-neutral-500">در حال پایان مزایده...</p>
          </div>
        )}

        {/* ─── ENDED AUCTION ─── */}
        {isEnded && (
          <div className="px-5 py-4">
            {/* === WINNER EXPERIENCE === */}
            {winner?.isOwnBid && (
              <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-success-500/15 to-success-700/5 border border-success-500/30">
                <div className="flex items-center gap-2 mb-3">
                  <PartyPopper className="w-5 h-5 text-success-600" />
                  <h3 className="text-base font-extrabold text-success-700">شما برنده مزایده شدید!</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="p-2.5 rounded-lg bg-neutral-100/40">
                    <p className="text-[10px] text-neutral-500 mb-0.5">قیمت نهایی مزایده</p>
                    <p className="text-sm font-bold text-success-700">{formatToman(auction.currentPrice)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-100/40">
                    <p className="text-[10px] text-neutral-500 mb-0.5">زمان پایان</p>
                    <p className="text-sm font-bold text-neutral-700">{formatJalaliDate(new Date(auction.endsAt))}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-100/40">
                    <p className="text-[10px] text-neutral-500 mb-0.5">تعداد کلیک‌های شما</p>
                    <p className="text-sm font-bold text-neutral-700">{toPersianDigits(userClickCount)}</p>
                  </div>
                  <div className="p-2.5 rounded-lg bg-neutral-100/40">
                    <p className="text-[10px] text-neutral-500 mb-0.5">مبلغ پرداختی برای کلیک‌ها</p>
                    <p className="text-sm font-bold text-neutral-700">{formatToman(userTotalSpent)}</p>
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-neutral-200/40 border border-neutral-200">
                  <p className="text-xs text-neutral-500 leading-relaxed">
                    تبریک! شما با آخرین کلیک معتبر برنده این مزایده شدید. برای پیگیری وضعیت جایزه و تحویل، به صفحه حساب کاربری مراجعه کنید.
                  </p>
                  <Link to="/account" className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 hover:text-primary-200 transition-colors mt-3">
                    <Trophy className="w-4 h-4" />
                    مشاهده تاریخچه و پیگیری جایزه
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                  <p className="text-[10px] text-neutral-600 mt-2">فرآیند تحویل جایزه به‌زودی فعال خواهد شد.</p>
                </div>
              </div>
            )}

            {/* === LOSER EXPERIENCE === */}
            {isLosingParticipant && (
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-3 p-3 rounded-lg bg-neutral-100/40 border border-neutral-300">
                  <div className="w-10 h-10 rounded-xl bg-neutral-200/30 border border-neutral-300 flex items-center justify-center shrink-0">
                    <Trophy className="w-5 h-5 text-neutral-500" />
                  </div>
                  <div>
                    <p className="text-xs text-neutral-500">برنده مزایده — آخرین کلیک‌کننده</p>
                    <p className="text-base font-bold text-neutral-800">{winner?.bidderName || 'کاربر'}</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="text-center">
                    <p className="text-xs text-neutral-500 mb-0.5">قیمت نهایی</p>
                    <p className="text-sm font-bold text-success-700">{formatToman(auction.currentPrice)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-neutral-500 mb-0.5">کلیک‌های شما</p>
                    <p className="text-sm font-bold text-neutral-700">{toPersianDigits(userClickCount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-neutral-500 mb-0.5">مبلغ مصرف‌شده</p>
                    <p className="text-sm font-bold text-neutral-700">{formatToman(userTotalSpent)}</p>
                  </div>
                </div>

                {/* Direct purchase option */}
                {auction.originalPrice && auction.originalPrice > 0 && (
                  <div className="p-3 rounded-lg border border-primary-300 bg-primary-500/5">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-500/20 flex items-center justify-center shrink-0">
                        <ShoppingBag className="w-4 h-4 text-primary-600" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-bold text-neutral-800 mb-0.5">خرید مستقیم کالا</h3>
                        <p className="text-xs text-neutral-500 mb-3">
                          می‌توانید این کالا را مستقیماً خریداری کنید. اعتبار مشارکت شما در خرید اعمال می‌شود.
                        </p>
                        <div className="flex items-center gap-3 mb-3 text-xs">
                          <span className="text-neutral-500">قیمت اصلی: <span className="font-bold text-neutral-700">{formatToman(auction.originalPrice)}</span></span>
                          <span className="text-neutral-500">اعتبار شما: <span className="font-bold text-primary-700">{formatToman(directPurchaseCredit)}</span></span>
                          <span className="text-neutral-500">باقی‌مانده: <span className="font-bold text-warning-700">{formatToman(directPurchaseRemaining)}</span></span>
                        </div>
                        <Button variant="primary" size="sm" onClick={() => { setPurchaseResult(null); setShowDirectPurchase(true); }}>
                          <ShoppingBag className="w-4 h-4" />
                          خرید مستقیم
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* === ENDED — DID NOT PARTICIPATE === */}
            {!userHasClicked && !winner?.isOwnBid && (
              <div>
                {winner && (
                  <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-neutral-100/40 border border-neutral-300">
                    <div className="w-10 h-10 rounded-xl bg-neutral-200/30 border border-neutral-300 flex items-center justify-center shrink-0">
                      <Trophy className="w-5 h-5 text-neutral-500" />
                    </div>
                    <div>
                      <p className="text-xs text-neutral-500">برنده — آخرین کلیک‌کننده</p>
                      <p className="text-base font-bold text-neutral-800">{winner.bidderName}</p>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <p className="text-xs text-neutral-500 mb-0.5">قیمت نهایی</p>
                    <p className="text-sm font-bold text-success-700">{formatToman(auction.currentPrice)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-neutral-500 mb-0.5">کلیک‌ها</p>
                    <p className="text-sm font-bold text-neutral-700">{toPersianDigits(auction.clickCount)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-neutral-500 mb-0.5">شرکت‌کنندگان</p>
                    <p className="text-sm font-bold text-neutral-700">{toPersianDigits(auction.participantCount)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── LAST FIVE CLICKERS — same card ─── */}
        {(isLive || isFinishing || isEnded) && (
          <div className="px-5 py-4 border-t border-neutral-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MousePointerClick className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-bold text-neutral-800">آخرین کلیک‌کنندگان</h2>
              </div>
              <Badge tone="neutral" variant="soft">
                {toPersianDigits(clickers.length)} نفر
              </Badge>
            </div>
            <LastFiveClickers clickers={clickers} />
          </div>
        )}
      </Card>

      {/* ═══ UPCOMING AUCTIONS ═══ */}
      {(tomorrowAuctions.length > 0 || dayAfterAuctions.length > 0) && (
        <div className="mt-6 space-y-5">
          {tomorrowAuctions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-warning-600" />
                <h2 className="text-sm font-bold text-neutral-800">مزایده فردا</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tomorrowAuctions.map((a) => (
                  <UpcomingAuctionCard key={a.id} auction={a} label="فردا" />
                ))}
              </div>
            </div>
          )}

          {dayAfterAuctions.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Calendar className="w-4 h-4 text-primary-600" />
                <h2 className="text-sm font-bold text-neutral-800">مزایده پس‌فردا</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dayAfterAuctions.map((a) => (
                  <UpcomingAuctionCard key={a.id} auction={a} label="پس‌فردا" />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Direct purchase confirmation modal */}
      <Modal open={showDirectPurchase} onClose={() => { if (!directPurchaseMutation.isPending) setShowDirectPurchase(false); }} size="sm">
        <div className="text-center py-2">
          {purchaseResult?.success ? (
            <>
              <div className="w-12 h-12 rounded-full bg-success-50 border border-success-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-success-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 mb-2">خرید مستقیم با موفقیت انجام شد</h3>
              <p className="text-sm text-neutral-500 mb-4">
                مبلغ {formatToman(purchaseResult.newBalance ?? 0)} باقی‌مانده از کیف پول شما کسر شد.
              </p>
              <Button variant="primary" fullWidth onClick={() => setShowDirectPurchase(false)}>
                باشه
              </Button>
            </>
          ) : purchaseResult?.error ? (
            <>
              <div className="w-12 h-12 rounded-full bg-error-50 border border-error-200 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-6 h-6 text-error-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 mb-2">خرید مستقیم ناموفق بود</h3>
              <p className="text-sm text-neutral-500 mb-4">{purchaseResult.error}</p>
              <Button variant="primary" fullWidth onClick={() => setPurchaseResult(null)}>
                تلاش مجدد
              </Button>
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-primary-50 border border-primary-300 flex items-center justify-center mx-auto mb-4">
                <ShoppingBag className="w-6 h-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 mb-4">تأیید خرید مستقیم</h3>
              <div className="space-y-2 mb-6 text-right">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-100/40">
                  <span className="text-sm text-neutral-500">قیمت اصلی کالا</span>
                  <span className="text-sm font-bold text-neutral-700">{formatToman(auction.originalPrice || 0)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-100/40">
                  <span className="text-sm text-neutral-500">اعتبار مشارکت شما</span>
                  <span className="text-sm font-bold text-primary-700">{formatToman(directPurchaseCredit)}</span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-neutral-100/40 border border-warning-500/20">
                  <span className="text-sm text-neutral-500">مبلغ باقی‌مانده</span>
                  <span className="text-sm font-bold text-warning-700">{formatToman(directPurchaseRemaining)}</span>
                </div>
              </div>
              <p className="text-xs text-neutral-600 mb-6">
                با تأیید خرید مستقیم، مبلغ باقی‌مانده از کیف پول شما کسر خواهد شد.
              </p>
              {directPurchaseMutation.isPending && (
                <div className="flex items-center justify-center gap-2 text-sm text-neutral-500 mb-4">
                  <Spinner className="w-4 h-4" />
                  در حال پردازش...
                </div>
              )}
              <div className="flex gap-3">
                <Button
                  variant="primary"
                  fullWidth
                  disabled={directPurchaseMutation.isPending}
                  onClick={async () => {
                    try {
                      const result = await directPurchaseMutation.mutateAsync({ auctionId: auction.id });
                      if (result.success) {
                        setPurchaseResult({ success: true, newBalance: result.newBalance });
                        toast.success('خرید مستقیم با موفقیت انجام شد');
                      } else {
                        setPurchaseResult({ success: false, error: result.error || 'خطای ناشناخته' });
                      }
                    } catch (err) {
                      setPurchaseResult({ success: false, error: err instanceof Error ? err.message : 'خطای ناشناخته' });
                    }
                  }}
                >
                  <Wallet className="w-4 h-4" />
                  تأیید خرید مستقیم
                </Button>
                <Button variant="ghost" disabled={directPurchaseMutation.isPending} onClick={() => setShowDirectPurchase(false)}>
                  انصراف
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
}
