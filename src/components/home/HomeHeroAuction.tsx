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
    <Link to={`/auctions/${auction.id}`} className="block group">
      <Card className="relative p-0 overflow-hidden border border-neutral-200 rounded-2xl">
        {/* Top accent bar — only for live/ending */}
        {isLive && (
          <div className={`h-1 w-full ${isEnding ? 'bg-error-500' : 'bg-accent-500'}`} />
        )}

        <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr] gap-0">
          {/* Image side */}
          <div className="relative aspect-[16/10] md:aspect-auto md:min-h-[300px] bg-gradient-to-br from-primary-900/90 to-primary-800/70 overflow-hidden">
            {auction.imageUrl ? (
              <img
                src={auction.imageUrl}
                alt={auction.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-slow"
                loading="eager"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Gavel className="w-16 h-16 text-primary-300/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Status badge */}
            <div className="absolute top-4 right-4 flex items-center gap-2">
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
              <p className="text-xs font-semibold text-primary-600 mb-1.5">
                {isLive ? `مزایده آنلاین ${BRAND_NAME}` : `مزایده آینده ${BRAND_NAME}`}
              </p>
              <h3 className="text-lg sm:text-xl font-extrabold text-neutral-800 line-clamp-2 mb-2.5">
                {auction.title}
              </h3>

              {auction.description && (
                <p className="text-sm text-neutral-500 line-clamp-2 mb-3">{auction.description}</p>
              )}

              <div className="flex items-baseline gap-2 mb-4">
                <span className="text-xs text-neutral-500">
                  {isLive ? 'قیمت فعلی:' : 'قیمت شروع:'}
                </span>
                <span className="text-2xl font-extrabold text-primary-700">
                  {formatCurrency(isLive ? auction.currentPrice : auction.startingPrice)}
                </span>
                {auction.originalPrice && (
                  <span className="text-sm text-neutral-400 line-through">
                    {formatCurrency(auction.originalPrice)}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-3 gap-2.5">
                {[
                  { icon: MousePointerClick, value: auction.clickCount, label: 'کلیک‌ها' },
                  { icon: Users, value: auction.participantCount, label: 'شرکت‌کنندگان' },
                  { icon: Zap, value: auction.clickIncrement, label: 'افزایش هر کلیک', format: true },
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
                className="group-hover:scale-[1.01] transition-transform text-sm font-bold py-3"
              >
                <MousePointerClick className="w-5 h-5" />
                {isLive ? 'ورود به مزایده' : 'مشاهده جزئیات'}
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}
