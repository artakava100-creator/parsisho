import { Link } from 'react-router-dom';
import {
  Gavel, MousePointerClick, Users, Zap, ArrowLeft, Clock as ClockIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { useAuctions, useServerTime } from '@/hooks/useAuction';
import { BRAND_NAME } from '@/config/brand';
import { SectionEmptyState } from './SectionEmptyState';

export function HomeHeroAuction() {
  const { data: auctions, isLoading, isError } = useAuctions();
  const { data: serverTimeData } = useServerTime();
  const serverTimeOffset = serverTimeData
    ? new Date(serverTimeData.serverTime).getTime() - Date.now()
    : 0;

  const activeAuction = auctions?.find((a) => a.status === 'live' || a.status === 'ending');
  const upcomingAuction = !activeAuction
    ? auctions?.find((a) => a.status === 'scheduled')
    : null;

  if (isLoading) {
    return (
      <div className="rounded-2xl overflow-hidden">
        <Skeleton className="w-full h-[280px] sm:h-[340px]" />
      </div>
    );
  }

  if (isError) {
    return (
      <Card className="p-8 text-center">
        <p className="text-sm text-neutral-500">خطا در دریافت اطلاعات مزایده</p>
        <Link to="/auctions" className="inline-block mt-3">
          <Button variant="outline" size="md">مشاهده تالار مزایده</Button>
        </Link>
      </Card>
    );
  }

  if (activeAuction) {
    const isEnding = activeAuction.status === 'ending';
    return (
      <Link to={`/auctions/${activeAuction.id}`} className="block group">
        <div className={`relative rounded-2xl p-[3px] ${isEnding ? 'auction-glow-urgent' : 'auction-glow'}`}>
          <Card className="relative p-0 overflow-hidden border-0 rounded-[14px]">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-0">
              {/* Image side */}
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[280px] bg-gradient-to-br from-primary-900/90 to-primary-800/70 overflow-hidden">
                {activeAuction.imageUrl ? (
                  <img
                    src={activeAuction.imageUrl}
                    alt={activeAuction.productName || activeAuction.title}
                    className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-slow"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gavel className="w-16 h-16 text-primary-300/40" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                {/* Live badge */}
                <div className="absolute top-4 right-4 flex items-center gap-2">
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-error-400" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error-500" />
                  </span>
                  <Badge tone={isEnding ? 'error' : 'primary'} variant="solid" className="text-xs font-bold">
                    {isEnding ? 'آخرین ثانیه‌ها' : 'مزایده آنلاین'}
                  </Badge>
                </div>

                {activeAuction.extensionUsed && (
                  <div className="absolute bottom-3 right-3">
                    <Badge tone="warning" variant="outline" className="text-[11px]">
                      <Zap className="w-3 h-3" /> تمدید شده
                    </Badge>
                  </div>
                )}
              </div>

              {/* Info side */}
              <div className="p-5 sm:p-6 flex flex-col justify-between gap-4 bg-white">
                <div>
                  <p className="text-xs font-semibold text-primary-600 mb-1.5">مزایده آنلاین {BRAND_NAME}</p>
                  <h3 className="text-lg sm:text-xl font-extrabold text-neutral-800 line-clamp-2 mb-2.5">
                    {activeAuction.productName || activeAuction.title}
                  </h3>

                  {activeAuction.description && (
                    <p className="text-sm text-neutral-500 line-clamp-1 mb-3">{activeAuction.description}</p>
                  )}

                  <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-xs text-neutral-500">قیمت فعلی:</span>
                    <span className="text-2xl font-extrabold text-primary-700">{formatCurrency(activeAuction.currentPrice)}</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {[
                      { icon: MousePointerClick, value: activeAuction.clickCount, label: 'کلیک‌ها' },
                      { icon: Users, value: activeAuction.participantCount, label: 'شرکت‌کنندگان' },
                      { icon: Zap, value: activeAuction.clickIncrement, label: 'افزایش هر کلیک', format: true },
                    ].map(({ icon: Icon, value, label, format }) => (
                      <div key={label} className="text-center p-2.5 rounded-xl bg-neutral-50 border border-neutral-100">
                        <Icon className="w-4 h-4 text-neutral-400 mx-auto mb-1" />
                        <p className="text-sm font-bold text-neutral-800">
                          {toPersianDigits(format ? value.toLocaleString('en-US') : value)}
                        </p>
                        <p className="text-[10px] text-neutral-500 mt-0.5">{label}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-1">
                  <div className="flex justify-center">
                    <CountdownTimer
                      startsAt={activeAuction.startsAt}
                      endsAt={activeAuction.endsAt}
                      serverTimeOffset={serverTimeOffset}
                      variant="compact"
                    />
                  </div>
                  <Button variant="primary" fullWidth size="md" className="group-hover:scale-[1.01] transition-transform text-sm font-bold py-3">
                    <MousePointerClick className="w-5 h-5" />
                    ورود به مزایده
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Link>
    );
  }

  if (upcomingAuction) {
    return (
      <Link to={`/auctions/${upcomingAuction.id}`} className="block group">
        <div className="relative rounded-2xl p-[3px] auction-glow-upcoming">
          <Card className="relative p-0 overflow-hidden border-0 rounded-[14px]">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.1fr] gap-0">
              <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[240px] bg-gradient-to-br from-neutral-100 to-neutral-200 overflow-hidden">
                {upcomingAuction.imageUrl ? (
                  <img
                    src={upcomingAuction.imageUrl}
                    alt={upcomingAuction.productName || upcomingAuction.title}
                    className="absolute inset-0 w-full h-full object-cover opacity-80"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Gavel className="w-14 h-14 text-neutral-300" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <Badge tone="warning" variant="soft" className="text-xs font-bold">
                    <ClockIcon className="w-3.5 h-3.5" /> مزایده آینده
                  </Badge>
                </div>
              </div>
              <div className="p-5 sm:p-6 flex flex-col justify-between gap-4 bg-white">
                <div>
                  <p className="text-xs font-semibold text-warning-600 mb-1.5">مزایده آنلاین آینده</p>
                  <h3 className="text-lg font-bold text-neutral-800 mb-3">
                    {upcomingAuction.productName || upcomingAuction.title}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                      <p className="text-xs text-neutral-500 mb-1">قیمت شروع</p>
                      <p className="text-base font-bold text-primary-700">{formatCurrency(upcomingAuction.startingPrice)}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-neutral-50 border border-neutral-100">
                      <p className="text-xs text-neutral-500 mb-1">هزینه هر کلیک</p>
                      <p className="text-base font-bold text-accent-700">{formatCurrency(upcomingAuction.clickCost)}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  <div className="flex justify-center">
                    <CountdownTimer
                      startsAt={upcomingAuction.startsAt}
                      endsAt={upcomingAuction.endsAt}
                      serverTimeOffset={serverTimeOffset}
                      variant="compact"
                    />
                  </div>
                  <Button variant="outline" fullWidth size="md" className="text-sm font-bold py-3">
                    مشاهده جزئیات
                    <ArrowLeft className="w-5 h-5" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </Link>
    );
  }

  return (
    <Card className="p-0 overflow-hidden">
      <SectionEmptyState
        icon={<Gavel className="w-6 h-6" />}
        title="در حال حاضر مزایده فعالی وجود ندارد"
        description={`مزایده‌های ${BRAND_NAME} به‌زودی شروع می‌شوند`}
        action={
          <Link to="/auctions">
            <Button variant="outline" size="sm">مشاهده تالار مزایده <ArrowLeft className="w-4 h-4" /></Button>
          </Link>
        }
      />
    </Card>
  );
}
