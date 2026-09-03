import { Link } from 'react-router-dom';
import {
  Gavel, Store, Wallet, Trophy, Gamepad2, Gift, Users, Building2,
  ArrowLeft, Sparkles, MousePointerClick, Zap,
  Calendar, Clock, Image as ImageIcon, Flame,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { formatJalaliDate, formatTime } from '@/lib/jalali';
import { useAuctions, useIranToday, useServerTime } from '@/hooks/useAuction';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import type { Auction } from '@/types';

const districts = [
  {
    to: '/auctions',
    title: 'تالار مزایده',
    description: 'مزایده‌های زنده و مهیج — با آخرین کلیک برنده شو',
    icon: Gavel,
    tone: 'primary' as const,
    badge: 'زنده',
    badgeTone: 'error' as const,
  },
  {
    to: '/market',
    title: 'بازار مستقیم',
    description: 'خرید مستقیم محصولات با قیمت مناسب',
    icon: Store,
    tone: 'secondary' as const,
  },
  {
    to: '/wallet',
    title: 'بانک پارسیشو',
    description: 'مدیریت موجودی، تراکنش‌ها و شارژ حساب',
    icon: Wallet,
    tone: 'accent' as const,
  },
  {
    to: '/missions',
    title: 'مرکز ماموریت‌ها',
    description: 'ماموریت‌های روزانه، هفتگی و جوایز ویژه',
    icon: Trophy,
    tone: 'success' as const,
  },
  {
    to: '/excitement',
    title: 'سرزمین هیجان',
    description: 'بازی‌های کوتاه، مهیج و پر از جایزه',
    icon: Gamepad2,
    tone: 'warning' as const,
    badge: 'جدید',
    badgeTone: 'success' as const,
  },
  {
    to: '/referrals',
    title: 'دعوت دوستان',
    description: 'دعوت دوستان و کسب جوایز دعوت',
    icon: Users,
    tone: 'secondary' as const,
  },
  {
    to: '/businesses',
    title: 'محله کسب‌وکار',
    description: 'کسب‌وکارهای محلی، تخفیف‌ها و پیشنهادها',
    icon: Building2,
    tone: 'primary' as const,
  },
  {
    to: '/rewards',
    title: 'خانه جایزه',
    description: 'جایزه روزانه، streak و جوایز فصلی',
    icon: Gift,
    tone: 'accent' as const,
  },
];

const toneClasses: Record<string, string> = {
  primary: 'from-primary-700/20 to-primary-700/5 text-primary-700 border-primary-500/20',
  secondary: 'from-secondary-500/20 to-secondary-700/5 text-secondary-700 border-secondary-500/20',
  accent: 'from-accent-500/20 to-accent-700/5 text-accent-700 border-accent-500/20',
  success: 'from-success-500/20 to-success-700/5 text-success-700 border-success-500/20',
  warning: 'from-warning-500/20 to-warning-700/5 text-warning-700 border-warning-500/20',
  error: 'from-error-500/20 to-error-700/5 text-error-700 border-error-500/20',
};

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
              <p className="text-xs font-bold text-primary-700">{formatCurrency(auction.startingPrice)}</p>
            </div>
            <div>
              <p className="text-[10px] text-neutral-600">هر کلیک</p>
              <p className="text-xs font-bold text-warning-700">{formatCurrency(auction.clickCost)}</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function HomePage() {
  const today = formatJalaliDate(new Date());
  const { data: auctions } = useAuctions();
  const { data: todayDateStr } = useIranToday();
  const { data: serverTimeData } = useServerTime();
  const serverTimeOffset = serverTimeData
    ? new Date(serverTimeData.serverTime).getTime() - Date.now()
    : 0;

  const todayDate = todayDateStr ?? new Date().toISOString().split('T')[0];
  const tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowStr = tomorrowDate.toISOString().split('T')[0];
  const dayAfterDate = new Date(todayDate);
  dayAfterDate.setDate(dayAfterDate.getDate() + 2);
  const dayAfterStr = dayAfterDate.toISOString().split('T')[0];

  const activeAuction = auctions?.find((a) => a.status === 'live' || a.status === 'ending');
  const tomorrowAuctions = (auctions || []).filter(
    (a) => a.auctionDate === tomorrowStr && a.status === 'scheduled'
  );
  const dayAfterAuctions = (auctions || []).filter(
    (a) => a.auctionDate === dayAfterStr && a.status === 'scheduled'
  );

  return (
    <div className="animate-fade-in">
      {/* Hero — compact */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary-950/30 via-surface to-surface" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-primary-50 rounded-full blur-[120px]" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-10">
          <div className="text-center max-w-2xl mx-auto">
            <Badge tone="primary" variant="soft" className="mb-4">
              <Sparkles className="w-3.5 h-3.5" />
              مزایده آنلاین پارسیشو
            </Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-neutral-800 leading-tight">
              هر کلیک، یک قدم به <span className="text-gradient-primary">برنده‌شدن</span>
            </h1>
            <p className="mt-4 text-base text-neutral-500 leading-relaxed">
              زمان محدود — قیمت زنده — برنده آخرین کلیک‌کننده معتبر است
            </p>
            <p className="mt-4 text-sm text-neutral-600">{today}</p>
          </div>
        </div>
      </section>

      {/* ─── LIVE AUCTION ─── */}
      {activeAuction ? (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-error-400" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error-500" />
            </span>
            <h2 className="text-lg font-bold text-neutral-800">مزایده آنلاین</h2>
            <Badge tone={activeAuction.status === 'ending' ? 'error' : 'primary'} variant="solid">
              {activeAuction.status === 'ending' ? 'آخرین ثانیه‌ها' : 'در حال برگزاری'}
            </Badge>
          </div>

          <Link to={`/auctions/${activeAuction.id}`} className="block group animate-fade-in-up">
            <div className="relative rounded-2xl overflow-hidden">
              <div className={`absolute -inset-0.5 bg-gradient-to-r from-primary-700/30 via-primary-400/10 to-primary-500/30 rounded-2xl blur-md ${
                activeAuction.status === 'ending' ? 'animate-pulse' : 'animate-pulse-glow'
              }`} />
              <Card className={`relative p-0 overflow-hidden border-2 ${
                activeAuction.status === 'ending' ? 'border-error-500/50' : 'border-primary-300'
              }`}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
                  {/* Image */}
                  <div className="aspect-[16/9] md:aspect-auto md:min-h-[260px] bg-gradient-to-br from-neutral-200 to-neutral-400 relative">
                    {activeAuction.imageUrl ? (
                      <img src={activeAuction.imageUrl} alt={activeAuction.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Gavel className="w-12 h-12 text-neutral-700" />
                      </div>
                    )}
                    {activeAuction.extensionUsed && (
                      <div className="absolute bottom-3 right-3">
                        <Badge tone="warning" variant="outline">
                          <Zap className="w-3 h-3" />
                          تمدید شده
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-5 md:p-6 flex flex-col justify-between gap-3">
                    <div>
                      <h3 className="text-lg md:text-xl font-extrabold text-neutral-800 mb-1">{activeAuction.productName || activeAuction.title}</h3>
                      <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{activeAuction.description || ''}</p>

                      <div className="flex items-baseline gap-2 mb-3">
                        <p className="text-xs text-neutral-500">قیمت فعلی:</p>
                        <p className="text-2xl font-extrabold text-primary-700">{formatCurrency(activeAuction.currentPrice)}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        <div className="text-center p-2 rounded-lg bg-neutral-100/40">
                          <MousePointerClick className="w-3 h-3 text-neutral-500 mx-auto mb-0.5" />
                          <p className="text-sm font-bold text-neutral-800">{toPersianDigits(activeAuction.clickCount)}</p>
                          <p className="text-[10px] text-neutral-600">کلیک‌ها</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-neutral-100/40">
                          <Users className="w-3 h-3 text-neutral-500 mx-auto mb-0.5" />
                          <p className="text-sm font-bold text-neutral-800">{toPersianDigits(activeAuction.participantCount)}</p>
                          <p className="text-[10px] text-neutral-600">شرکت‌کنندگان</p>
                        </div>
                        <div className="text-center p-2 rounded-lg bg-neutral-100/40">
                          <Zap className="w-3 h-3 text-neutral-500 mx-auto mb-0.5" />
                          <p className="text-sm font-bold text-neutral-600">{toPersianDigits(activeAuction.clickIncrement.toLocaleString('en-US'))}</p>
                          <p className="text-[10px] text-neutral-600">افزایش هر کلیک</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <div className="flex justify-center">
                        <CountdownTimer
                          startsAt={activeAuction.startsAt}
                          endsAt={activeAuction.endsAt}
                          serverTimeOffset={serverTimeOffset}
                          variant="hero"
                        />
                      </div>
                      <Button variant="primary" fullWidth size="lg" className="group-hover:scale-[1.02] transition-transform">
                        <MousePointerClick className="w-5 h-5" />
                        کلیک کن
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          </Link>
        </section>
      ) : (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex items-center gap-2 mb-4">
            <Flame className="w-4 h-4 text-neutral-500" />
            <h2 className="text-lg font-bold text-neutral-800">مزایده آنلاین</h2>
          </div>
          <Card className="p-6 text-center max-w-2xl">
            <p className="text-sm text-neutral-500">در حال حاضر مزایده فعالی وجود ندارد</p>
            <Link to="/auctions" className="inline-block mt-3">
              <Button variant="outline" size="md">
                مشاهده مزایده‌های آینده
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
          </Card>
        </section>
      )}

      {/* ─── TOMORROW ─── */}
      {tomorrowAuctions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-warning-600" />
            <h2 className="text-base font-bold text-neutral-800">مزایده فردا</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {tomorrowAuctions.map((a) => (
              <UpcomingAuctionCard key={a.id} auction={a} label="فردا" />
            ))}
          </div>
        </section>
      )}

      {/* ─── DAY AFTER TOMORROW ─── */}
      {dayAfterAuctions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-primary-600" />
            <h2 className="text-base font-bold text-neutral-800">مزایده پس‌فردا</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {dayAfterAuctions.map((a) => (
              <UpcomingAuctionCard key={a.id} auction={a} label="پس‌فردا" />
            ))}
          </div>
        </section>
      )}

      {/* ─── DISTRICTS ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-neutral-800">محله‌های شهر</h2>
          <Link to="/map" className="text-sm text-primary-700 hover:text-primary-200 flex items-center gap-1">
            مشاهده نقشه شهر
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {districts.map((district, idx) => {
            const Icon = district.icon;
            return (
              <Link key={district.to} to={district.to} className="block animate-fade-in-up" style={{ animationDelay: `${idx * 40}ms` }}>
                <Card hover className="p-4 h-full">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${toneClasses[district.tone]} border flex items-center justify-center mb-3`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <h3 className="text-sm font-bold text-neutral-800">{district.title}</h3>
                    {district.badge && (
                      <Badge tone={district.badgeTone} variant="solid" className="text-[10px] px-1.5 py-0.5">
                        {district.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500 leading-relaxed">{district.description}</p>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ─── ALL AUCTIONS LINK ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <Link to="/auctions">
          <Card hover className="p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Gavel className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h3 className="text-base font-bold text-neutral-800">تالار مزایده</h3>
                <p className="text-sm text-neutral-500">مشاهده همه مزایده‌ها — فردا، پس‌فردا و نتایج گذشته</p>
              </div>
            </div>
            <ArrowLeft className="w-5 h-5 text-neutral-500" />
          </Card>
        </Link>
      </section>
    </div>
  );
}
