import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Gavel, ArrowLeft, Clock, Calendar, Flame, Star, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatToman } from '@/lib/persian';
import { formatTime } from '@/lib/jalali';
import { useAuctions, useIranToday } from '@/hooks/useAuction';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { SectionEmptyState } from './SectionEmptyState';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import type { Auction } from '@/types';

interface CategoryConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  sort_order: number;
}

interface HallConfig {
  categories: CategoryConfig[];
}

const defaultHallConfig: HallConfig = {
  categories: [
    { id: 'today', label: 'مزایده امروز', icon: 'flame', visible: true, sort_order: 1 },
    { id: 'tomorrow', label: 'مزایده فردا', icon: 'calendar', visible: true, sort_order: 2 },
    { id: 'day-after', label: 'مزایده پس‌فردا', icon: 'star', visible: true, sort_order: 3 },
    { id: 'all', label: 'همه مزایده‌ها', icon: 'sparkles', visible: true, sort_order: 4 },
  ],
};

const iconMap: Record<string, LucideIcon> = {
  flame: Flame,
  calendar: Calendar,
  star: Star,
  sparkles: Sparkles,
  gavel: Gavel,
  clock: Clock,
};

const colorMap: Record<string, { normal: string; active: string }> = {
  today: {
    normal: 'bg-accent-50 text-accent-700 border-accent-200/60',
    active: 'bg-accent-600 text-white border-accent-600 shadow-md',
  },
  tomorrow: {
    normal: 'bg-primary-50 text-primary-700 border-primary-200/60',
    active: 'bg-primary-700 text-white border-primary-700 shadow-md',
  },
  'day-after': {
    normal: 'bg-warning-50 text-warning-700 border-warning-200/60',
    active: 'bg-warning-500 text-white border-warning-500 shadow-md',
  },
  all: {
    normal: 'bg-neutral-50 text-neutral-600 border-neutral-200/60',
    active: 'bg-neutral-700 text-white border-neutral-700 shadow-md',
  },
};

const defaultColors = {
  normal: 'bg-neutral-50 text-neutral-600 border-neutral-200/60',
  active: 'bg-neutral-700 text-white border-neutral-700 shadow-md',
};

function getFilterFn(catId: string) {
  return (a: Auction, todayStr: string, tomorrowStr: string, dayAfterStr: string) => {
    if (catId === 'today') return a.auctionDate === todayStr;
    if (catId === 'tomorrow') return a.auctionDate === tomorrowStr;
    if (catId === 'day-after') return a.auctionDate === dayAfterStr;
    return true;
  };
}

function AuctionMiniCard({ auction, isSelected }: { auction: Auction; isSelected?: boolean }) {
  return (
    <Link to={`/auctions/${auction.id}`} className="block group">
      <Card hover glass={false} className={cn('p-0 overflow-hidden h-full transition-all rounded-2xl border border-neutral-200', isSelected === false && 'opacity-60')}>
        <div className="aspect-[16/9] bg-gradient-to-br from-neutral-100 to-neutral-200 relative overflow-hidden">
          {auction.imageUrl ? (
            <img
              src={auction.imageUrl}
              alt={auction.productName || auction.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-300"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gavel className="w-8 h-8 text-neutral-300" />
            </div>
          )}
          <div className="absolute top-2.5 right-2.5">
            <Badge
              tone={auction.status === 'live' || auction.status === 'ending' ? 'error' : 'warning'}
              variant="solid"
              className="text-[10px] font-bold"
            >
              {auction.status === 'live' || auction.status === 'ending' ? 'زنده' : 'برنامه‌ریزی'}
            </Badge>
          </div>
        </div>
        <div className="p-3 sm:p-3.5 space-y-2">
          <h4 className="text-sm font-bold text-neutral-800 truncate">
            {auction.productName || auction.title}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="w-3.5 h-3.5" />
            <span>شروع: {formatTime(new Date(auction.startsAt))}</span>
          </div>
          <div className="flex items-center justify-between pt-1.5 border-t border-neutral-100">
            <div>
              <p className="text-[10px] text-neutral-500">قیمت شروع</p>
              <p className="text-sm font-bold text-primary-700">{formatToman(auction.startingPrice)}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-500">هر کلیک</p>
              <p className="text-sm font-bold text-accent-700">{formatToman(auction.clickCost)}</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function EmptySlotCard() {
  return (
    <div className="aspect-[16/9] rounded-2xl border-2 border-dashed border-neutral-200/70 bg-neutral-50/40 flex flex-col items-center justify-center gap-2">
      <Gavel className="w-7 h-7 text-neutral-300" />
      <p className="text-xs text-neutral-400 font-medium">جایگاه مزایده</p>
    </div>
  );
}

export function AuctionHall() {
  const { data: hallConfig } = useSiteSetting<HallConfig>('auction_hall_categories', defaultHallConfig);
  const config = hallConfig ?? defaultHallConfig;
  const visibleCategories = useMemo(
    () => config.categories.filter((c) => c.visible).sort((a, b) => a.sort_order - b.sort_order),
    [config.categories],
  );

  const [activeCategory, setActiveCategory] = useState(visibleCategories[0]?.id ?? 'today');
  const { data: auctions, isLoading, isError } = useAuctions();
  const { data: todayDateStr } = useIranToday();

  const todayStr = todayDateStr ?? new Date().toISOString().split('T')[0];

  const tomorrowStr = useMemo(() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, [todayStr]);

  const dayAfterStr = useMemo(() => {
    const d = new Date(todayStr);
    d.setDate(d.getDate() + 2);
    return d.toISOString().split('T')[0];
  }, [todayStr]);

  const filtered = useMemo(() => {
    if (!auctions) return [];
    const filterFn = getFilterFn(activeCategory);
    return auctions.filter((a) => filterFn(a, todayStr, tomorrowStr, dayAfterStr));
  }, [auctions, activeCategory, todayStr, tomorrowStr, dayAfterStr]);

  return (
    <section className="py-4 sm:py-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-primary-100 flex items-center justify-center">
              <Gavel className="w-4 h-4 sm:w-5 sm:h-5 text-primary-700" />
            </div>
            <h2 className="text-base sm:text-xl font-extrabold text-neutral-800">تالار مزایده</h2>
          </div>
          <Link
            to="/auctions"
            className="text-xs sm:text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
          >
            همه مزایده‌ها
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Visual category cards */}
        <div className="flex gap-2 sm:gap-2.5 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide pb-1" role="tablist">
          {visibleCategories.map((cat) => {
            const Icon = iconMap[cat.icon] ?? Sparkles;
            const isActive = activeCategory === cat.id;
            const colors = colorMap[cat.id] ?? defaultColors;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2.5 sm:py-3 rounded-lg sm:rounded-xl border whitespace-nowrap',
                  'transition-all duration-200 font-bold text-xs sm:text-sm',
                  isActive ? colors.active : colors.normal,
                  !isActive && 'hover:shadow-sm hover:-translate-y-px',
                )}
              >
                <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Auction grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="w-full h-[240px] rounded-2xl" />
            ))}
          </div>
        ) : isError ? (
          <Card className="p-0">
            <SectionEmptyState
              icon={<Gavel className="w-6 h-6" />}
              title="خطا در دریافت مزایده‌ها"
              description="لطفاً صفحه را مجدداً بارگذاری کنید"
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.length > 0
              ? filtered.map((auction) => <AuctionMiniCard key={auction.id} auction={auction} />)
              : [0, 1, 2].map((i) => <EmptySlotCard key={i} />)
            }
          </div>
        )}
      </div>
    </section>
  );
}
