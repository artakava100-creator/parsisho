import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Gavel, ArrowLeft, Clock, Calendar, Flame, Star, Sparkles,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/persian';
import { formatTime } from '@/lib/jalali';
import { useAuctions, useIranToday } from '@/hooks/useAuction';
import { SectionEmptyState } from './SectionEmptyState';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import type { Auction } from '@/types';

interface AuctionCategory {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  activeColor: string;
  filterFn: (auction: Auction, todayStr: string, tomorrowStr: string, dayAfterStr: string) => boolean;
}

const categories: AuctionCategory[] = [
  {
    id: 'today',
    label: 'مزایده امروز',
    icon: Flame,
    color: 'bg-accent-50 text-accent-700 border-accent-200/60',
    activeColor: 'bg-accent-600 text-white border-accent-600 shadow-md',
    filterFn: (a, todayStr) => a.auctionDate === todayStr,
  },
  {
    id: 'tomorrow',
    label: 'مزایده فردا',
    icon: Calendar,
    color: 'bg-primary-50 text-primary-700 border-primary-200/60',
    activeColor: 'bg-primary-700 text-white border-primary-700 shadow-md',
    filterFn: (a, _t, tomorrowStr) => a.auctionDate === tomorrowStr,
  },
  {
    id: 'day-after',
    label: 'مزایده پس‌فردا',
    icon: Star,
    color: 'bg-warning-50 text-warning-700 border-warning-200/60',
    activeColor: 'bg-warning-500 text-white border-warning-500 shadow-md',
    filterFn: (a, _t, _tm, dayAfterStr) => a.auctionDate === dayAfterStr,
  },
  {
    id: 'all',
    label: 'همه مزایده‌ها',
    icon: Sparkles,
    color: 'bg-neutral-50 text-neutral-600 border-neutral-200/60',
    activeColor: 'bg-neutral-700 text-white border-neutral-700 shadow-md',
    filterFn: () => true,
  },
];

function AuctionMiniCard({ auction }: { auction: Auction }) {
  return (
    <Link to={`/auctions/${auction.id}`} className="block group">
      <Card hover className="p-0 overflow-hidden h-full">
        <div className="aspect-[16/9] bg-gradient-to-br from-neutral-100 to-neutral-200 relative overflow-hidden">
          {auction.imageUrl ? (
            <img
              src={auction.imageUrl}
              alt={auction.productName || auction.title}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-slow"
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
        <div className="p-3.5 space-y-2">
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
              <p className="text-sm font-bold text-primary-700">{formatCurrency(auction.startingPrice)}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-500">هر کلیک</p>
              <p className="text-sm font-bold text-accent-700">{formatCurrency(auction.clickCost)}</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <Skeleton className="w-full h-[220px]" />
        </div>
      ))}
    </div>
  );
}

export function AuctionHall() {
  const [activeCategory, setActiveCategory] = useState('today');
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
    const cat = categories.find((c) => c.id === activeCategory);
    if (!cat) return [];
    return auctions.filter((a) => cat.filterFn(a, todayStr, tomorrowStr, dayAfterStr));
  }, [auctions, activeCategory, todayStr, tomorrowStr, dayAfterStr]);

  return (
    <section className="py-8 sm:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary-100 flex items-center justify-center">
              <Gavel className="w-5 h-5 text-primary-700" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-neutral-800">تالار مزایده</h2>
          </div>
          <Link
            to="/auctions"
            className="text-sm font-semibold text-primary-600 hover:text-primary-700 flex items-center gap-1.5 transition-colors"
          >
            همه مزایده‌ها
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </div>

        {/* Category cards — horizontal scrollable */}
        <div className="flex gap-2.5 mb-6 overflow-x-auto scrollbar-hide pb-1" role="tablist">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2.5 rounded-xl border whitespace-nowrap',
                  'transition-all duration-normal font-semibold text-sm',
                  isActive ? cat.activeColor : cat.color,
                  !isActive && 'hover:shadow-sm hover:-translate-y-px',
                )}
              >
                <Icon className="w-4.5 h-4.5" />
                {cat.label}
              </button>
            );
          })}
        </div>

        {/* Auction grid */}
        {isLoading ? (
          <LoadingCards />
        ) : isError ? (
          <Card className="p-0">
            <SectionEmptyState
              icon={<Gavel className="w-6 h-6" />}
              title="خطا در دریافت مزایده‌ها"
              description="لطفاً صفحه را مجدداً بارگذاری کنید"
            />
          </Card>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((auction) => (
              <AuctionMiniCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <Card className="p-0">
            <SectionEmptyState
              icon={<Calendar className="w-6 h-6" />}
              title="در حال حاضر مزایده‌ای در این بازه وجود ندارد"
              description="مزایده‌های جدید به‌زودی اضافه می‌شوند"
              action={
                <Link to="/auctions">
                  <Button variant="outline" size="sm">
                    مشاهده همه مزایده‌ها <ArrowLeft className="w-4 h-4" />
                  </Button>
                </Link>
              }
            />
          </Card>
        )}
      </div>
    </section>
  );
}
