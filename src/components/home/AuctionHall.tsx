import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Gavel, ArrowLeft, Clock, Store, Building2, LayoutGrid,
  TrendingUp, MapPin, Package, Star,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatToman, formatCompact } from '@/lib/persian';
import { formatTime } from '@/lib/jalali';
import { useAuctions, useAuctionMedia } from '@/hooks/useAuction';
import { useBusinesses } from '@/hooks/useBusinesses';
import { useBestSellingStores } from '@/hooks/useBestSellingStores';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { SectionEmptyState } from './SectionEmptyState';
import { cn } from '@/lib/cn';
import type { LucideIcon } from 'lucide-react';
import type { Auction, BusinessSummary } from '@/types';
import type { BestSellingStore } from '@/hooks/useBestSellingStores';

// ─── Config Types ──────────────────────────────────────────────────

interface HallTabConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  sort_order: number;
}

interface HallConfig {
  tabs: HallTabConfig[];
}

const defaultHallConfig: HallConfig = {
  tabs: [
    { id: 'upcoming_auctions', label: 'مزایده‌های آینده', icon: 'gavel', visible: true, sort_order: 1 },
    { id: 'best_selling', label: 'پرفروش‌ترین فروشگاه‌ها', icon: 'store', visible: true, sort_order: 2 },
    { id: 'local_businesses', label: 'کسب‌وکارهای محلی', icon: 'building', visible: true, sort_order: 3 },
    { id: 'all', label: 'همه', icon: 'grid', visible: true, sort_order: 4 },
  ],
};

const iconMap: Record<string, LucideIcon> = {
  gavel: Gavel,
  store: Store,
  building: Building2,
  grid: LayoutGrid,
  clock: Clock,
  trending: TrendingUp,
  star: Star,
  package: Package,
  mapPin: MapPin,
};

// ─── Auction Card ───────────────────────────────────────────────────

function AuctionCard({ auction }: { auction: Auction }) {
  const { data: media } = useAuctionMedia(auction.id);
  const mediaImages = (media ?? []).slice(0, 4);
  const displayImage = auction.imageUrl;

  return (
    <Link to={`/auctions/${auction.id}`} className="block group">
      <Card hover glass={false} className="p-0 h-full overflow-hidden transition-all duration-300 rounded-2xl border border-neutral-200/80 hover:border-primary-300/60 hover:shadow-lg">
        <div className="aspect-[16/10] bg-gradient-to-br from-neutral-100 to-neutral-200 relative overflow-hidden">
          {displayImage ? (
            <img
              src={displayImage}
              alt={auction.productName || auction.title}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Gavel className="w-8 h-8 text-neutral-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
          <div className="absolute top-3 right-3 z-10">
            <Badge
              tone={auction.status === 'live' || auction.status === 'ending' ? 'error' : 'warning'}
              variant="solid"
              className="text-[10px] font-bold shadow-sm"
            >
              {auction.status === 'live' || auction.status === 'ending' ? 'زنده' : 'برنامه‌ریزی'}
            </Badge>
          </div>
          {mediaImages.length > 0 && (
            <div className="absolute bottom-2.5 left-2.5 z-10 flex gap-1">
              {mediaImages.slice(0, 3).map((img, idx) => (
                <span
                  key={img.id}
                  className="w-1.5 h-1.5 rounded-full bg-white/70"
                />
              ))}
            </div>
          )}
        </div>
        <div className="p-3.5 space-y-2.5">
          <h4 className="text-sm font-bold text-neutral-800 truncate leading-relaxed">
            {auction.productName || auction.title}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-neutral-500">
            <Clock className="w-3.5 h-3.5 text-neutral-400" />
            <span>شروع: {formatTime(new Date(auction.startsAt))}</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <div>
              <p className="text-[10px] text-neutral-400 mb-0.5">قیمت شروع</p>
              <p className="text-sm font-bold text-primary-700">{formatToman(auction.startingPrice)}</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-400 mb-0.5">هر کلیک</p>
              <p className="text-sm font-bold text-accent-700">{formatToman(auction.clickCost)}</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Best-Selling Store Card ─────────────────────────────────────────

function StoreCard({ store, rank }: { store: BestSellingStore; rank: number }) {
  return (
    <Link to="/market" className="block group">
      <Card hover glass={false} className="p-0 h-full overflow-hidden transition-all duration-300 rounded-2xl border border-neutral-200/80 hover:border-accent-300/60 hover:shadow-lg">
        <div className="relative p-4 pb-3 bg-gradient-to-br from-accent-50/60 to-neutral-50">
          <div className="flex items-start gap-3">
            <div className="relative shrink-0">
              {store.avatar_url ? (
                <img
                  src={store.avatar_url}
                  alt={store.store_name}
                  className="w-12 h-12 rounded-xl object-cover border border-neutral-200"
                  loading="lazy"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-primary-100 flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary-600" />
                </div>
              )}
              <span className={cn(
                'absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white',
                rank === 1 ? 'bg-accent-500 text-white' : 'bg-neutral-200 text-neutral-600',
              )}>
                {formatCompact(rank)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-neutral-800 truncate leading-relaxed">{store.store_name}</h4>
              <div className="flex items-center gap-1.5 mt-1">
                <Package className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-xs text-neutral-500">{formatCompact(store.product_count)} محصول</span>
              </div>
            </div>
          </div>
        </div>
        {store.top_product_image && (
          <div className="aspect-[16/9] bg-neutral-100 overflow-hidden">
            <img
              src={store.top_product_image}
              alt={store.top_product_name ?? ''}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
            />
          </div>
        )}
        <div className="p-3.5 space-y-2">
          {store.top_product_name && (
            <p className="text-xs text-neutral-600 truncate font-medium">{store.top_product_name}</p>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-100">
            <div>
              <p className="text-[10px] text-neutral-400 mb-0.5">فروخته شده</p>
              <p className="text-sm font-bold text-accent-700">{formatCompact(store.total_sold)} عدد</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-400 mb-0.5">درآمد کل</p>
              <p className="text-sm font-bold text-primary-700">{formatCompact(store.total_revenue)} تومان</p>
            </div>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Local Business Card ────────────────────────────────────────────

function BusinessCard({ business }: { business: BusinessSummary }) {
  return (
    <Link to={`/businesses/${business.slug}`} className="block group">
      <Card hover glass={false} className="p-0 h-full overflow-hidden transition-all duration-300 rounded-2xl border border-neutral-200/80 hover:border-local-300/60 hover:shadow-lg">
        <div className="aspect-[16/9] bg-gradient-to-br from-local-50 to-neutral-100 relative overflow-hidden">
          {business.logoPath ? (
            <img
              src={business.logoPath}
              alt={business.name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
            />
          ) : business.coverPath ? (
            <img
              src={business.coverPath}
              alt={business.name}
              className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-8 h-8 text-local-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
          {business.isFeatured && (
            <div className="absolute top-3 right-3 z-10">
              <Badge tone="warning" variant="solid" className="text-[10px] font-bold shadow-sm">
                ویژه
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3.5 space-y-2">
          <h4 className="text-sm font-bold text-neutral-800 truncate leading-relaxed">{business.name}</h4>
          {business.shortDescription && (
            <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">{business.shortDescription}</p>
          )}
          <div className="flex items-center gap-1.5 text-xs text-neutral-500 pt-2 border-t border-neutral-100">
            <MapPin className="w-3.5 h-3.5 text-local-400" />
            <span className="truncate">
              {business.categoryName}
              {business.city ? ` — ${business.city}` : ''}
            </span>
          </div>
        </div>
      </Card>
    </Link>
  );
}

// ─── Empty Slot ──────────────────────────────────────────────────────

function EmptySlotCard({ icon, label }: { icon: LucideIcon; label: string }) {
  const Icon = icon;
  return (
    <div className="aspect-[16/10] rounded-2xl border-2 border-dashed border-neutral-200/70 bg-neutral-50/40 flex flex-col items-center justify-center gap-2">
      <Icon className="w-7 h-7 text-neutral-300" />
      <p className="text-xs text-neutral-400 font-medium">{label}</p>
    </div>
  );
}

// ─── Loading Grid ────────────────────────────────────────────────────

function LoadingGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="w-full h-[260px] rounded-2xl" />
      ))}
    </div>
  );
}

// ─── Error State ─────────────────────────────────────────────────────

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="p-0">
      <SectionEmptyState
        icon={<Gavel className="w-6 h-6" />}
        title="خطا در دریافت اطلاعات"
        description={message}
      />
    </Card>
  );
}

// ─── Main Component ──────────────────────────────────────────────────

export function AuctionHall() {
  const { data: hallConfig } = useSiteSetting<HallConfig>('auction_hall_categories', defaultHallConfig);
  const config = hallConfig ?? defaultHallConfig;
  const visibleTabs = useMemo(
    () => config.tabs.filter((t) => t.visible).sort((a, b) => a.sort_order - b.sort_order),
    [config.tabs],
  );

  const [activeTab, setActiveTab] = useState(visibleTabs[0]?.id ?? 'upcoming_auctions');

  const { data: auctions, isLoading: auctionsLoading, isError: auctionsError } = useAuctions();
  const { data: businessesData, isLoading: businessesLoading, isError: businessesError } = useBusinesses({ limit: 12, offset: 0 });
  const { data: bestStores, isLoading: storesLoading, isError: storesError } = useBestSellingStores(12);

  const businesses = businessesData?.businesses ?? [];

  const upcomingAuctions = useMemo(() => {
    if (!auctions) return [];
    const now = new Date().toISOString();
    return auctions
      .filter((a) => a.status === 'scheduled' || a.status === 'live' || a.status === 'ending')
      .filter((a) => a.endsAt > now)
      .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
      .slice(0, 12);
  }, [auctions]);

  const allContent = useMemo(() => {
    const items: { type: 'auction' | 'store' | 'business'; data: Auction | BestSellingStore | BusinessSummary; rank?: number }[] = [];
    upcomingAuctions.slice(0, 4).forEach((a) => items.push({ type: 'auction', data: a }));
    (bestStores ?? []).slice(0, 4).forEach((s, i) => items.push({ type: 'store', data: s, rank: i + 1 }));
    businesses.slice(0, 4).forEach((b) => items.push({ type: 'business', data: b }));
    return items;
  }, [upcomingAuctions, bestStores, businesses]);

  const renderContent = () => {
    if (activeTab === 'upcoming_auctions') {
      if (auctionsLoading) return <LoadingGrid />;
      if (auctionsError) return <ErrorState message="لطفاً صفحه را مجدداً بارگذاری کنید" />;
      if (upcomingAuctions.length === 0) {
        return (
          <Card className="p-0">
            <SectionEmptyState
              icon={<Gavel className="w-6 h-6" />}
              title="مزایده‌ای در دست راه نیست"
              description="به‌زودی مزایده‌های جدید آغاز می‌شوند"
            />
          </Card>
        );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {upcomingAuctions.map((auction) => <AuctionCard key={auction.id} auction={auction} />)}
        </div>
      );
    }

    if (activeTab === 'best_selling') {
      if (storesLoading) return <LoadingGrid />;
      if (storesError) return <ErrorState message="لطفاً صفحه را مجدداً بارگذاری کنید" />;
      if ((bestStores ?? []).length === 0) {
        return (
          <Card className="p-0">
            <SectionEmptyState
              icon={<Store className="w-6 h-6" />}
              title="هنوز فروشگاهی ثبت نشده است"
              description="با ثبت اولین فروش، فروشگاه‌ها در این بخش نمایش داده می‌شوند"
            />
          </Card>
        );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {(bestStores ?? []).map((store, idx) => <StoreCard key={store.seller_id} store={store} rank={idx + 1} />)}
        </div>
      );
    }

    if (activeTab === 'local_businesses') {
      if (businessesLoading) return <LoadingGrid />;
      if (businessesError) return <ErrorState message="لطفاً صفحه را مجدداً بارگذاری کنید" />;
      if (businesses.length === 0) {
        return (
          <Card className="p-0">
            <SectionEmptyState
              icon={<Building2 className="w-6 h-6" />}
              title="کسب‌وکاری ثبت نشده است"
              description="کسب‌وکارهای محلی به‌زودی در این بخش نمایش داده می‌شوند"
            />
          </Card>
        );
      }
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {businesses.map((biz) => <BusinessCard key={biz.id} business={biz} />)}
        </div>
      );
    }

    // "all" tab — combined content
    const anyLoading = auctionsLoading && storesLoading && businessesLoading;
    if (anyLoading) return <LoadingGrid />;

    if (allContent.length === 0) {
      return (
        <Card className="p-0">
          <SectionEmptyState
            icon={<LayoutGrid className="w-6 h-6" />}
            title="محتوایی برای نمایش وجود ندارد"
            description="به‌زودی محتوا در این بخش قرار می‌گیرد"
          />
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
        {allContent.map((item, idx) => {
          if (item.type === 'auction') return <AuctionCard key={`a-${idx}`} auction={item.data as Auction} />;
          if (item.type === 'store') return <StoreCard key={`s-${idx}`} store={item.data as BestSellingStore} rank={item.rank ?? 1} />;
          return <BusinessCard key={`b-${idx}`} business={item.data as BusinessSummary} />;
        })}
      </div>
    );
  };

  return (
    <section className="pt-3 sm:pt-4 pb-4 sm:pb-8">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {/* Header */}
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

        {/* Segmented Tab Control */}
        <div className="mb-4 sm:mb-6">
          <div className="inline-flex p-1 rounded-xl bg-neutral-100/80 border border-neutral-200/60 gap-0.5 overflow-x-auto scrollbar-hide max-w-full" role="tablist">
            {visibleTabs.map((tab) => {
              const Icon = iconMap[tab.icon] ?? Gavel;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    'flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-lg whitespace-nowrap',
                    'transition-all duration-200 font-bold text-xs sm:text-sm',
                    isActive
                      ? 'bg-white text-primary-700 shadow-sm border border-primary-200/50'
                      : 'text-neutral-500 hover:text-neutral-700 hover:bg-white/60 border border-transparent',
                  )}
                >
                  <Icon className={cn('w-4 h-4 sm:w-[18px] sm:h-[18px]', isActive ? 'text-primary-600' : 'text-neutral-400')} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content */}
        {renderContent()}
      </div>
    </section>
  );
}
