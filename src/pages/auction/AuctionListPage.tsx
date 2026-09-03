import { Link } from 'react-router-dom';
import {
  Gavel, Flame, Calendar, Users, Clock, Trophy,
  Image as ImageIcon, Bell, Zap, MousePointerClick,
} from 'lucide-react';
import { useAuctions, useIranToday, useServerTime } from '@/hooks/useAuction';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { formatJalaliDate, formatTime, formatJalaliShort } from '@/lib/jalali';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { useState } from 'react';
import type { Auction } from '@/types';

// ─── Live Auction Banner (dominant hero) ─────────────────────────
function LiveAuctionHero({ auction, serverTimeOffset }: { auction: Auction; serverTimeOffset: number }) {
  const isEnding = auction.status === 'ending';
  return (
    <Link to={`/auctions/${auction.id}`} className="block animate-fade-in-up">
      <div className="relative rounded-2xl overflow-hidden group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-primary-700/30 via-primary-400/10 to-primary-500/30 rounded-2xl blur-md animate-pulse-glow" />
        <Card className={`relative p-0 overflow-hidden border-2 ${
          isEnding ? 'border-error-500/50' : 'border-primary-300'
        }`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
            {/* Image side */}
            <div className="aspect-video md:aspect-auto md:min-h-[280px] bg-gradient-to-br from-neutral-200 to-neutral-400 relative">
              {auction.imageUrl ? (
                <img src={auction.imageUrl} alt={auction.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Gavel className="w-12 h-12 text-neutral-700" />
                </div>
              )}
              <div className="absolute top-4 right-4 flex items-center gap-2">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-error-400" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-error-500" />
                </span>
                <Badge tone="error" variant="solid" className="animate-pulse">
                  <Flame className="w-3 h-3" />
                  {isEnding ? 'آخرین ثانیه‌ها' : 'مزایده آنلاین'}
                </Badge>
              </div>
              {auction.extensionUsed && (
                <div className="absolute bottom-4 right-4">
                  <Badge tone="warning" variant="outline">
                    <Zap className="w-3 h-3" />
                    تمدید شده
                  </Badge>
                </div>
              )}
            </div>

            {/* Info side */}
            <div className="p-5 md:p-6 flex flex-col justify-between gap-3">
              <div>
                <h2 className="text-lg md:text-xl font-extrabold text-neutral-800 mb-1">{auction.productName || auction.title}</h2>
                <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{auction.description || ''}</p>

                <div className="flex items-baseline gap-2 mb-3">
                  <p className="text-xs text-neutral-500">قیمت فعلی:</p>
                  <p className="text-xl font-extrabold text-primary-700">{formatCurrency(auction.currentPrice)}</p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center p-2 rounded-lg bg-neutral-100/40">
                    <MousePointerClick className="w-3 h-3 text-neutral-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-neutral-800">{toPersianDigits(auction.clickCount)}</p>
                    <p className="text-[10px] text-neutral-600">کلیک‌ها</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-neutral-100/40">
                    <Users className="w-3 h-3 text-neutral-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-neutral-800">{toPersianDigits(auction.participantCount)}</p>
                    <p className="text-[10px] text-neutral-600">شرکت‌کنندگان</p>
                  </div>
                  <div className="text-center p-2 rounded-lg bg-neutral-100/40">
                    <Zap className="w-3 h-3 text-neutral-500 mx-auto mb-0.5" />
                    <p className="text-sm font-bold text-neutral-600">{toPersianDigits(auction.clickIncrement.toLocaleString('en-US'))}</p>
                    <p className="text-[10px] text-neutral-600">افزایش هر کلیک</p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <div className="flex justify-center">
                  <CountdownTimer
                    startsAt={auction.startsAt}
                    endsAt={auction.endsAt}
                    serverTimeOffset={serverTimeOffset}
                    variant="hero"
                  />
                </div>
                <Button variant="primary" fullWidth size="lg" className="group-hover:scale-[1.02] transition-transform">
                  <MousePointerClick className="w-5 h-5" />
                  کلیک کن
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </Link>
  );
}

// ─── Tomorrow's Auction (dedicated section) ──────────────────────
function TomorrowAuction({ auction, serverTimeOffset }: { auction: Auction; serverTimeOffset: number }) {
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
            <Badge tone="warning" variant="soft">فردا</Badge>
          </div>
        </div>
        <div className="p-4 space-y-2.5">
          <h3 className="text-sm font-bold text-neutral-800 truncate">{auction.productName || auction.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="w-3 h-3" />
            شروع: {formatTime(new Date(auction.startsAt))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-neutral-600">قیمت شروع</p>
              <p className="text-sm font-bold text-primary-700">{formatCurrency(auction.startingPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-600">هر کلیک</p>
              <p className="text-sm font-bold text-warning-700">{formatCurrency(auction.clickCost)}</p>
            </div>
          </div>
          <div className="flex justify-center pt-1">
            <CountdownTimer
              startsAt={auction.startsAt}
              endsAt={auction.endsAt}
              serverTimeOffset={serverTimeOffset}
              variant="compact"
            />
          </div>
          <ReminderButton />
        </div>
      </Card>
    </Link>
  );
}

// ─── Upcoming Auction Card ──────────────────────────────────────
function UpcomingAuctionCard({ auction, serverTimeOffset }: { auction: Auction; serverTimeOffset: number }) {
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
            <Badge tone="primary" variant="soft">{formatJalaliShort(new Date(auction.auctionDate))}</Badge>
          </div>
        </div>
        <div className="p-4 space-y-2.5">
          <h3 className="text-sm font-bold text-neutral-800 truncate">{auction.productName || auction.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Calendar className="w-3 h-3" />
            {formatJalaliDate(new Date(auction.auctionDate))} — {formatTime(new Date(auction.startsAt))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] text-neutral-600">قیمت شروع</p>
              <p className="text-sm font-bold text-primary-700">{formatCurrency(auction.startingPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-600">هر کلیک</p>
              <p className="text-sm font-bold text-warning-700">{formatCurrency(auction.clickCost)}</p>
            </div>
          </div>
          <div className="flex justify-center pt-1">
            <CountdownTimer
              startsAt={auction.startsAt}
              endsAt={auction.endsAt}
              serverTimeOffset={serverTimeOffset}
              variant="compact"
            />
          </div>
          <ReminderButton />
        </div>
      </Card>
    </Link>
  );
}

// ─── Ended Auction Card ──────────────────────────────────────────
function EndedAuctionCard({ auction }: { auction: Auction }) {
  return (
    <Link to={`/auctions/${auction.id}`} className="block group animate-fade-in">
      <Card hover className="p-0 overflow-hidden h-full opacity-80 hover:opacity-100 transition-opacity">
        <div className="aspect-[16/7] bg-gradient-to-br from-neutral-200 to-neutral-400 relative">
          {auction.imageUrl ? (
            <img src={auction.imageUrl} alt={auction.title} className="w-full h-full object-cover grayscale" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Trophy className="w-8 h-8 text-neutral-700" />
            </div>
          )}
          <div className="absolute top-2.5 right-2.5">
            <Badge tone="neutral" variant="soft">
              <Trophy className="w-3 h-3" />
              پایان‌یافته
            </Badge>
          </div>
          {auction.status === 'cancelled' && (
            <div className="absolute top-2.5 left-2.5">
              <Badge tone="error" variant="soft">لغو شده</Badge>
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <h3 className="text-sm font-bold text-neutral-600 truncate">{auction.productName || auction.title}</h3>
          <div className="flex items-center gap-1.5 text-xs text-neutral-600">
            <Calendar className="w-3 h-3" />
            {formatJalaliShort(new Date(auction.auctionDate))}
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-neutral-600">قیمت نهایی</p>
              <p className="text-sm font-bold text-neutral-600">{formatCurrency(auction.currentPrice)}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-600">کلیک‌ها</p>
              <p className="text-sm text-neutral-500">{toPersianDigits(auction.clickCount)}</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Reminder Button ─────────────────────────────────────────────
function ReminderButton() {
  const [requested, setRequested] = useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      fullWidth
      disabled={requested}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setRequested(true);
      }}
    >
      <Bell className="w-3.5 h-3.5" />
      {requested ? 'یادآوری تنظیم شد' : 'یادآوری مزایده'}
    </Button>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────
function HeroSkeleton() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <Skeleton className="aspect-video md:min-h-[280px] rounded-none" />
        <div className="p-5 md:p-6 space-y-4">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Card>
  );
}

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, tone }: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  tone: 'error' | 'warning' | 'primary' | 'neutral';
}) {
  const toneClasses: Record<string, string> = {
    error: 'text-error-600',
    warning: 'text-warning-600',
    primary: 'text-primary-600',
    neutral: 'text-neutral-500',
  };
  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className={toneClasses[tone]}>{icon}</span>
        <h2 className="text-base font-bold text-neutral-800">{title}</h2>
      </div>
      {subtitle && <p className="text-sm text-neutral-500 mr-7">{subtitle}</p>}
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────
export function AuctionListPage() {
  const { data: auctions, isLoading, error } = useAuctions();
  const { data: today } = useIranToday();
  const { data: serverTimeData } = useServerTime();
  const serverTimeOffset = serverTimeData
    ? new Date(serverTimeData.serverTime).getTime() - Date.now()
    : 0;

  if (isLoading) {
    return (
      <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-extrabold text-neutral-800 mb-1">تالار مزایده</h1>
          <p className="text-sm text-neutral-500">مزایده‌های رسمی روزانه پارسیشو</p>
        </div>
        <HeroSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-8 px-4 max-w-6xl mx-auto">
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="خطا در بارگذاری مزایده‌ها"
          description="لطفاً بعداً دوباره تلاش کنید"
        />
      </div>
    );
  }

  if (!auctions || auctions.length === 0) {
    return (
      <div className="py-8 px-4 max-w-6xl mx-auto">
        <h1 className="text-xl font-extrabold text-neutral-800 mb-6">تالار مزایده</h1>
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="مزایده‌ای موجود نیست"
          description="فعلاً مزایده‌ای برای نمایش وجود ندارد. بعداً مراجعه کنید."
        />
      </div>
    );
  }

  const todayDate = today ?? new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const dayAfterDate = new Date(todayDate);
  dayAfterDate.setDate(dayAfterDate.getDate() + 2);
  const dayAfterStr = dayAfterDate.toISOString().split('T')[0];

  const activeAuction = auctions.find((a) => a.status === 'live' || a.status === 'ending');

  const todayScheduled = !activeAuction
    ? auctions.filter((a) => a.auctionDate === todayDate && a.status === 'scheduled')
    : [];

  const tomorrowAuctions = auctions.filter(
    (a) => a.auctionDate === tomorrowStr && a.status === 'scheduled'
  );

  const dayAfterAuctions = auctions.filter(
    (a) => a.auctionDate === dayAfterStr && a.status === 'scheduled'
  );

  const allUpcoming = auctions.filter(
    (a) => a.auctionDate > dayAfterStr && a.status === 'scheduled'
  );

  const endedAuctions = auctions.filter(
    (a) => a.status === 'ended' || a.status === 'cancelled'
  );

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-extrabold text-neutral-800 mb-1">تالار مزایده</h1>
        <p className="text-sm text-neutral-500">مزایده‌های رسمی روزانه پارسیشو</p>
      </div>

      {/* A) LIVE AUCTION — dominant */}
      {activeAuction && (
        <section className="mb-10">
          <LiveAuctionHero auction={activeAuction} serverTimeOffset={serverTimeOffset} />
        </section>
      )}

      {/* Today's scheduled (only if no active auction) */}
      {!activeAuction && todayScheduled.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            icon={<Flame className="w-4 h-4" />}
            title="مزایده امروز"
            subtitle="این مزایده امروز برگزار می‌شود"
            tone="error"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {todayScheduled.map((auction) => (
              <UpcomingAuctionCard key={auction.id} auction={auction} serverTimeOffset={serverTimeOffset} />
            ))}
          </div>
        </section>
      )}

      {/* No active auction message */}
      {!activeAuction && todayScheduled.length === 0 && (
        <section className="mb-10">
          <Card className="p-6 text-center max-w-2xl">
            <p className="text-sm text-neutral-500">در حال حاضر مزایده فعالی وجود ندارد</p>
          </Card>
        </section>
      )}

      {/* B) TOMORROW */}
      {tomorrowAuctions.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            icon={<Calendar className="w-4 h-4" />}
            title="مزایده فردا"
            subtitle="مزایده‌ای که فردا برگزار می‌شود"
            tone="warning"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {tomorrowAuctions.map((auction) => (
              <TomorrowAuction key={auction.id} auction={auction} serverTimeOffset={serverTimeOffset} />
            ))}
          </div>
        </section>
      )}

      {/* C) DAY AFTER TOMORROW */}
      {dayAfterAuctions.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            icon={<Calendar className="w-4 h-4" />}
            title="مزایده پس‌فردا"
            subtitle="مزایده‌ای که پس‌فردا برگزار می‌شود"
            tone="primary"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {dayAfterAuctions.map((auction) => (
              <UpcomingAuctionCard key={auction.id} auction={auction} serverTimeOffset={serverTimeOffset} />
            ))}
          </div>
        </section>
      )}

      {/* D) UPCOMING */}
      {allUpcoming.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            icon={<Calendar className="w-4 h-4" />}
            title="مزایده‌های آینده"
            subtitle="مزایده‌های برنامه‌ریزی‌شده در روزهای آینده"
            tone="primary"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {allUpcoming.map((auction) => (
              <UpcomingAuctionCard key={auction.id} auction={auction} serverTimeOffset={serverTimeOffset} />
            ))}
          </div>
        </section>
      )}

      {/* E) COMPLETED */}
      {endedAuctions.length > 0 && (
        <section>
          <SectionHeader
            icon={<Trophy className="w-4 h-4" />}
            title="مزایده‌های پایان‌یافته"
            subtitle="نتایج مزایده‌های گذشته"
            tone="neutral"
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {endedAuctions.map((auction) => (
              <EndedAuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </section>
      )}

      {/* Absolute empty state */}
      {!activeAuction && todayScheduled.length === 0 && tomorrowAuctions.length === 0 && dayAfterAuctions.length === 0 && allUpcoming.length === 0 && endedAuctions.length === 0 && (
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="مزایده‌ای موجود نیست"
          description="فعلاً مزایده‌ای برای نمایش وجود ندارد."
        />
      )}
    </div>
  );
}
