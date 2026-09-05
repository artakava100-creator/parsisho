import { Link } from 'react-router-dom';
import {
  Gavel, MousePointerClick, Users, Zap, ArrowLeft, Clock as ClockIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { CountdownTimer } from '@/components/auction/CountdownTimer';
import { formatToman, toPersianDigits } from '@/lib/persian';
import { useHomepageAuction } from '@/hooks/useAuction';
import { BRAND_NAME } from '@/config/brand';
import { SectionEmptyState } from './SectionEmptyState';

export function HomeHeroAuction() {
  const { data: auction, isLoading, isError, refetch } = useHomepageAuction();

  const serverTimeOffset = auction
    ? new Date(auction.serverTime).getTime() - Date.now()
    : 0;

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
        <div className="flex items-center justify-center gap-3 mt-3">
          <Button variant="outline" size="md" onClick={() => refetch()}>
            تلاش مجدد
          </Button>
          <Link to="/auctions">
            <Button variant="ghost" size="md">مشاهده تالار مزایده</Button>
          </Link>
        </div>
      </Card>
    );
  }

  if (!auction) {
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

  const isLive = auction.status === 'live' || auction.status === 'ending';
  const isEnding = auction.status === 'ending';
  const isScheduled = auction.status === 'scheduled';

  return (
    <Card className="relative p-0 overflow-hidden border border-neutral-200 rounded-2xl">
      {/* Stretched navigation link — covers exactly the card content area */}
      <Link to={`/auctions/${auction.id}`} className="absolute inset-0 z-10" aria-label={auction.title} />

      {/* Top accent bar — only for live/ending */}
      {isLive && (
        <div className={`h-1 w-full ${isEnding ? 'bg-error-500' : 'bg-accent-500'}`} />
      )}

      <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-0">
        {/* Image side — content-driven height, no forced min-height */}
        <div className="relative aspect-[16/10] md:aspect-auto bg-gradient-to-br from-primary-900/90 to-primary-800/70 overflow-hidden">
          {auction.imageUrl ? (
            <img
              src={auction.imageUrl}
              alt={auction.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="eager"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Gavel className="w-16 h-16 text-primary-300/40" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

          {/* Status badge */}
          <div className="absolute top-3 right-3 sm:top-4 sm:right-4 flex items-center gap-2 z-20">
            {isLive && (
              <>
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-error-400" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-error-500" />
                </span>
                <Badge tone={isEnding ? 'error' : 'accent'} variant="solid" className="text-xs font-bold">
                  {isEnding ? 'آخرین ثانیه‌ها' : 'مزایده آنلاین'}
                </Badge>
              </>
            )}
            {isScheduled && (
              <Badge tone="primary" variant="soft" className="text-xs font-bold">
                <ClockIcon className="w-3.5 h-3.5" /> آغاز به‌زودی
              </Badge>
            )}
          </div>

          {auction.extensionUsed && (
            <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-20">
              <Badge tone="warning" variant="outline" className="text-[11px]">
                <Zap className="w-3 h-3" /> تمدید شده
              </Badge>
            </div>
          )}
        </div>

        {/* Info side — content drives the height */}
        <div className="p-4 sm:p-6 flex flex-col gap-3 sm:gap-4 bg-white">
          <div>
            <p className="text-[11px] sm:text-xs font-semibold text-primary-600 mb-1">
              {isLive ? `مزایده آنلاین ${BRAND_NAME}` : `مزایده آینده ${BRAND_NAME}`}
            </p>
            <h3 className="text-base sm:text-xl font-extrabold text-neutral-800 line-clamp-2 mb-2">
              {auction.title}
            </h3>

            {auction.description && (
              <p className="text-xs sm:text-sm text-neutral-500 line-clamp-2 mb-2.5">{auction.description}</p>
            )}

            {/* Price hierarchy */}
            <div className="rounded-xl sm:rounded-2xl border border-neutral-200 bg-neutral-50/60 p-3 sm:p-4 mb-3 sm:mb-4 space-y-2.5 sm:space-y-3">
              {/* Original price — secondary treatment */}
              {auction.originalPrice != null && auction.originalPrice > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-neutral-500">قیمت اصلی محصول</span>
                  <span className="text-sm font-bold text-neutral-400 line-through tabular-nums">
                    {formatToman(auction.originalPrice)}
                  </span>
                </div>
              )}

              {/* Current auction price — the visual hero */}
              <div className="flex items-end justify-between gap-2">
                <span className="text-[11px] sm:text-xs font-semibold text-primary-600 whitespace-nowrap">
                  {isLive ? 'قیمت فعلی مزایده' : 'قیمت شروع مزایده'}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-[2rem] font-extrabold text-primary-700 tabular-nums leading-none">
                    {formatToman(isLive ? auction.currentPrice : auction.startingPrice).replace(' تومان', '')}
                  </span>
                  <span className="text-sm font-bold text-primary-600">تومان</span>
                </div>
              </div>

              {/* Savings — only when data is valid */}
              {auction.originalPrice != null && auction.originalPrice > 0 && isLive && auction.currentPrice < auction.originalPrice && (
                <div className="flex items-center justify-between pt-2.5 border-t border-neutral-200/70">
                  <span className="text-[11px] font-medium text-neutral-500">صرفه‌جویی شما</span>
                  <span className="text-sm font-bold text-success-600 tabular-nums">
                    {formatToman(auction.originalPrice - auction.currentPrice)}
                  </span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: MousePointerClick, value: auction.clickCount, label: 'کلیک‌ها' },
                { icon: Users, value: auction.participantCount, label: 'شرکت‌کنندگان' },
                { icon: Zap, value: auction.clickIncrement, label: 'افزایش هر کلیک', format: true },
              ].map(({ icon: Icon, value, label, format }) => (
                <div key={label} className="text-center p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-neutral-50 border border-neutral-100">
                  <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-neutral-400 mx-auto mb-1" />
                  <p className="text-xs sm:text-sm font-bold text-neutral-800">
                    {toPersianDigits(format ? value.toLocaleString('en-US') : value)}
                  </p>
                  <p className="text-[9px] sm:text-[10px] text-neutral-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 mt-auto">
            <div className="flex justify-center">
              <CountdownTimer
                startsAt={auction.startsAt}
                endsAt={auction.endsAt}
                serverTimeOffset={serverTimeOffset}
                variant="hero"
              />
            </div>
            <Button
              variant={isLive ? 'primary' : 'outline'}
              fullWidth
              size="md"
              className="relative z-20 text-sm font-bold py-3"
            >
              <MousePointerClick className="w-5 h-5" />
              {isLive ? 'ورود به مزایده' : 'مشاهده جزئیات'}
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
