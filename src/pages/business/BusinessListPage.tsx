import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, MapPin, Star, Store, Factory, Wrench, Brush, Cookie, Wheat, AlertCircle, Plus, SlidersHorizontal, X, RefreshCw } from 'lucide-react';
import { BusinessHeroSlider } from '@/components/business/BusinessHeroSlider';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useBusinessCategories, useBusinesses } from '@/hooks/useBusinesses';
import { env } from '@/config/env';
import { cn } from '@/lib/cn';
import type { BusinessSummary } from '@/types';

const CATEGORY_ICONS: Record<string, typeof Store> = {
  Store,
  Factory,
  Wrench,
  Brush,
  Cookie,
  Wheat,
  Building2,
};

function getLogoUrl(logoPath: string | null): string | null {
  if (!logoPath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${logoPath}`;
}

function getCoverUrl(coverPath: string | null): string | null {
  if (!coverPath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${coverPath}`;
}

function BusinessCard({ business }: { business: BusinessSummary }) {
  const coverUrl = getCoverUrl(business.coverPath);
  const logoUrl = getLogoUrl(business.logoPath);
  const cardImageUrl = coverUrl ?? logoUrl;

  return (
    <Link to={`/businesses/${business.slug}`} className="block group animate-fade-in-up">
      <Card hover className="p-0 overflow-hidden h-full flex flex-col">
        <div className="aspect-[16/10] bg-gradient-to-br from-neutral-200 to-neutral-300 relative overflow-hidden">
          {cardImageUrl ? (
            <img
              src={cardImageUrl}
              alt={business.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary-50 to-surface-overlay">
              <Building2 className="w-10 h-10 text-primary-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-normal" />
          {logoUrl && (
            <div className="absolute bottom-2.5 right-2.5 w-10 h-10 rounded-xl overflow-hidden border-2 border-surface shadow-md bg-surface">
              <img src={logoUrl} alt={business.name} className="w-full h-full object-cover" />
            </div>
          )}
          {business.isFeatured && (
            <div className="absolute top-2.5 right-2.5">
              <Badge tone="accent" variant="solid" className="text-[10px] px-2 py-0.5 shadow-sm">
                <Star className="w-3 h-3 fill-current" />
                ویژه
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3.5 flex flex-col flex-1 gap-2">
          <h3 className="text-sm font-bold text-neutral-800 leading-snug line-clamp-1 group-hover:text-primary-700 transition-colors">
            {business.name}
          </h3>
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <Badge tone="primary" variant="soft" className="text-[10px] px-2 py-0.5">
              {business.categoryName}
            </Badge>
          </div>
          {business.shortDescription && (
            <p className="text-xs text-neutral-500 leading-relaxed line-clamp-2">
              {business.shortDescription}
            </p>
          )}
          {business.city && (
            <div className="flex items-center gap-1 text-xs text-neutral-500 mt-auto pt-1">
              <MapPin className="w-3 h-3 text-primary-400" />
              <span>{business.city}</span>
              {business.locality && <span className="text-neutral-400">، {business.locality}</span>}
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}

function BusinessCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden border border-neutral-200 bg-surface">
      <div className="aspect-[16/10] bg-neutral-100 animate-pulse" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 bg-neutral-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-neutral-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-neutral-100 rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export function BusinessListPage() {
  const { data: categories, isLoading: catLoading } = useBusinessCategories();
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [city, setCity] = useState('');

  const queryParams = useMemo(() => ({
    categorySlug: activeCategory,
    search: search.trim() || null,
    city: city.trim() || null,
    limit: 48,
  }), [activeCategory, search, city]);

  const { data, isLoading, error, refetch } = useBusinesses(queryParams);

  const hasFilters = activeCategory || search.trim() || city.trim();
  const clearFilters = () => {
    setActiveCategory(null);
    setSearch('');
    setCity('');
  };

  if (catLoading) {
    return (
      <div className="animate-fade-in pb-12">
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 pb-2">
          <div className="rounded-xl sm:rounded-2xl bg-neutral-100 animate-pulse h-[200px] sm:h-[280px] lg:h-[320px]" />
        </section>
      </div>
    );
  }

  return (
    <div className="animate-fade-in pb-12">
      {/* Business Slider */}
      <BusinessHeroSlider />

      {/* Header */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pt-5 sm:pt-7 pb-4 sm:pb-5">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-primary-50 border border-primary-200 flex items-center justify-center shrink-0">
            <Building2 className="w-5 h-5 sm:w-5.5 sm:h-5.5 text-primary-700" />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl lg:text-2xl font-extrabold text-neutral-900">محله کسب‌وکار</h1>
            <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">
              کشف کسب‌وکارها، تولیدکنندگان و خدمات‌دهندگان محلی مورد اعتماد
            </p>
          </div>
          <Link to="/businesses/register" className="shrink-0 hidden sm:block">
            <Button size="sm">
              <Plus className="w-4 h-4" />
              ثبت کسب‌وکار
            </Button>
          </Link>
        </div>
      </section>

      {/* Category Navigation */}
      {categories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1.5 -mx-1 px-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-normal border',
                activeCategory === null
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-surface-overlay text-neutral-600 border-transparent hover:text-neutral-800 hover:border-neutral-300'
              )}
            >
              همه
            </button>
            {categories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.iconName ?? 'Building2'] ?? Building2;
              return (
                <button
                  key={cat.id}
                  onClick={() => setActiveCategory(cat.slug)}
                  className={cn(
                    'shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-normal border',
                    activeCategory === cat.slug
                      ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                      : 'bg-surface-overlay text-neutral-600 border-transparent hover:text-neutral-800 hover:border-neutral-300'
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {cat.name}
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Search & City Filter */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-5">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <Input
              placeholder="جستجوی کسب‌وکار..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10 bg-surface border-neutral-200"
            />
          </div>
          <div className="relative flex-1 sm:w-48 sm:flex-none">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
            <Input
              placeholder="شهر..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pr-10 bg-surface border-neutral-200"
            />
          </div>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium text-neutral-500 hover:text-neutral-700 hover:bg-neutral-100 transition-colors border border-neutral-200 bg-surface"
            >
              <X className="w-4 h-4" />
              پاک کردن
            </button>
          )}
        </div>
      </section>

      {/* Results count */}
      {data && data.businesses.length > 0 && (
        <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 pb-3">
          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <SlidersHorizontal className="w-3.5 h-3.5 text-primary-400" />
            <span>
              {data.total} کسب‌وکار یافت شد
            </span>
          </div>
        </section>
      )}

      {/* Business Grid */}
      <section className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <BusinessCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <Card className="p-8">
            <EmptyState
              icon={<AlertCircle className="w-8 h-8" />}
              title="خطا در بارگذاری"
              description="لطفاً دوباره تلاش کنید"
              action={
                <Button size="sm" variant="secondary" onClick={() => refetch()}>
                  <RefreshCw className="w-4 h-4" />
                  تلاش مجدد
                </Button>
              }
            />
          </Card>
        ) : !data || data.businesses.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={<Building2 className="w-8 h-8" />}
              title={hasFilters ? "نتیجه‌ای یافت نشد" : "هنوز کسب‌وکاری ثبت نشده"}
              description={hasFilters ? "فیلترها را تغییر دهید یا پاک کنید" : "به‌زودی کسب‌وکارهای محلی در اینجا نمایش داده می‌شوند"}
              action={
                hasFilters ? (
                  <Button size="sm" variant="secondary" onClick={clearFilters}>
                    <X className="w-4 h-4" />
                    پاک کردن فیلترها
                  </Button>
                ) : (
                  <Link to="/businesses/register">
                    <Button size="sm">
                      <Plus className="w-4 h-4" />
                      ثبت کسب‌وکار
                    </Button>
                  </Link>
                )
              }
            />
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {data.businesses.map((biz) => (
              <BusinessCard key={biz.id} business={biz} />
            ))}
          </div>
        )}
      </section>

      {/* Mobile floating register button */}
      <Link to="/businesses/register" className="sm:hidden fixed bottom-20 left-4 z-40">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-primary-600 text-white shadow-lg active:scale-95 transition-transform">
          <Plus className="w-4 h-4" />
          <span className="text-sm font-bold">ثبت کسب‌وکار</span>
        </div>
      </Link>
    </div>
  );
}
