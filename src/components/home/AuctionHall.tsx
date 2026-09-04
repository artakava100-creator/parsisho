import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Gavel, ArrowLeft, Clock, Calendar } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/persian';
import { formatTime } from '@/lib/jalali';
import { useAuctions, useIranToday } from '@/hooks/useAuction';
import { SectionEmptyState } from './SectionEmptyState';
import { HomeSection } from './HomeSection';
import type { Auction } from '@/types';

interface AuctionTab {
  id: string;
  label: string;
  filterFn: (auction: Auction, todayStr: string, tomorrowStr: string, dayAfterStr: string) => boolean;
}

const tabs: AuctionTab[] = [
  {
    id: 'today',
    label: 'امروز',
    filterFn: (a, todayStr) => a.auctionDate === todayStr,
  },
  {
    id: 'tomorrow',
    label: 'فردا',
    filterFn: (a, _t, tomorrowStr) => a.auctionDate === tomorrowStr,
  },
  {
    id: 'day-after',
    label: 'پس‌فردا',
    filterFn: (a, _t, _tm, dayAfterStr) => a.auctionDate === dayAfterStr,
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
              <Gavel className="w-7 h-7 text-neutral-300" />
            </div>
          )}
          <div className="absolute top-2 right-2">
            <Badge
              tone={auction.status === 'live' || auction.status === 'ending' ? 'error' : 'warning'}
              variant="solid"
              className="text-[9px]"
            >
              {auction.status === 'live' || auction.status === 'ending' ? 'زنده' : 'برنامه‌ریزی'}
            </Badge>
          </div>
        </div>
        <div className="p-3 space-y-1.5">
          <h4 className="text-xs font-bold text-neutral-800 truncate">
            {auction.productName || auction.title}
          </h4>
          <div className="flex items-center gap-1 text-[10px] text-neutral-500">
            <Clock className="w-3 h-3" />
            <span>شروع: {formatTime(new Date(auction.startsAt))}</span>
          </div>
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[9px] text-neutral-500">قیمت شروع</p>
              <p className="text-xs font-bold text-primary-700">{formatCurrency(auction.startingPrice)}</p>
            </div>
            <div className="text-left">
              <p className="text-[9px] text-neutral-500">هر کلیک</p>
              <p className="text-xs font-bold text-accent-700">{formatCurrency(auction.clickCost)}</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function LoadingCards() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl overflow-hidden">
          <Skeleton className="w-full h-[200px]" />
        </div>
      ))}
    </div>
  );
}

export function AuctionHall() {
  const [activeTab, setActiveTab] = useState('today');
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
    const tab = tabs.find((t) => t.id === activeTab);
    if (!tab) return [];
    return auctions.filter((a) => tab.filterFn(a, todayStr, tomorrowStr, dayAfterStr));
  }, [auctions, activeTab, todayStr, tomorrowStr, dayAfterStr]);

  return (
    <HomeSection
      title="تالار مزایده"
      action={
        <Link to="/auctions" className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors">
          همه مزایده‌ها
          <ArrowLeft className="w-3.5 h-3.5" />
        </Link>
      }
      className="py-8"
    >
      {/* Tabs */}
      <div className="flex items-center gap-1 mb-5 overflow-x-auto scrollbar-hide" role="tablist">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            role="tab"
            aria-selected={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? 'bg-primary-700 text-white'
                : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {isLoading ? (
        <LoadingCards />
      ) : isError ? (
        <Card className="p-0">
          <SectionEmptyState
            icon={<Gavel className="w-5 h-5" />}
            title="خطا در دریافت مزایده‌ها"
            description="لطفاً صفحه را مجدداً بارگذاری کنید"
          />
        </Card>
      ) : filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((auction) => (
            <AuctionMiniCard key={auction.id} auction={auction} />
          ))}
        </div>
      ) : (
        <Card className="p-0">
          <SectionEmptyState
            icon={<Calendar className="w-5 h-5" />}
            title="در حال حاضر مزایده‌ای در این بازه وجود ندارد"
            description="مزایده‌های جدید به‌زودی اضافه می‌شوند"
            action={
              <Link to="/auctions">
                <Button variant="outline" size="sm">
                  مشاهده همه مزایده‌ها <ArrowLeft className="w-3.5 h-3.5" />
                </Button>
              </Link>
            }
          />
        </Card>
      )}
    </HomeSection>
  );
}
