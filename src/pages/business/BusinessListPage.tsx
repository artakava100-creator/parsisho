import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Search, MapPin, Star, Store, Factory, Wrench, Brush, Cookie, Wheat, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
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

function getBusinessImageUrl(logoPath: string | null, coverPath: string | null): string | null {
  const path = logoPath ?? coverPath;
  if (!path) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/businesses/${path}`;
}

function BusinessCard({ business }: { business: BusinessSummary }) {
  const imageUrl = getBusinessImageUrl(business.logoPath, business.coverPath);

  return (
    <Link to={`/businesses/${business.slug}`} className="block group animate-fade-in-up">
      <Card hover className="p-0 overflow-hidden h-full flex flex-col">
        <div className="aspect-[16/10] bg-gradient-to-br from-neutral-200 to-neutral-400 relative overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={business.name}
              loading="lazy"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Building2 className="w-10 h-10 text-neutral-700" />
            </div>
          )}
          {business.isFeatured && (
            <div className="absolute top-2.5 right-2.5">
              <Badge tone="accent" variant="solid" className="text-[10px] px-2 py-0.5">
                <Star className="w-3 h-3 fill-current" />
                ویژه
              </Badge>
            </div>
          )}
        </div>
        <div className="p-3.5 flex flex-col flex-1 gap-2">
          <h3 className="text-sm font-bold text-neutral-800 leading-snug line-clamp-1">
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
              <MapPin className="w-3 h-3" />
              <span>{business.city}</span>
              {business.locality && <span className="text-neutral-600">، {business.locality}</span>}
            </div>
          )}
        </div>
      </Card>
    </Link>
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

  const { data, isLoading, error } = useBusinesses(queryParams);

  if (catLoading) return <FullPageSpinner />;

  return (
    <div className="animate-fade-in pb-12">
      {/* Header */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-500/25 flex items-center justify-center">
            <Building2 className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-800">محله کسب‌وکار</h1>
            <p className="text-sm text-neutral-500">
              کشف کسب‌وکارها، تولیدکنندگان و خدمات‌دهندگان محلی مورد اعتماد
            </p>
          </div>
        </div>
      </section>

      {/* Category Navigation */}
      {categories && categories.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
            <button
              onClick={() => setActiveCategory(null)}
              className={cn(
                'shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-normal border',
                activeCategory === null
                  ? 'bg-primary-50 text-primary-700 border-primary-300'
                  : 'bg-surface-overlay text-neutral-500 border-transparent hover:text-neutral-700 hover:border-neutral-300'
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
                    'shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-normal border',
                    activeCategory === cat.slug
                      ? 'bg-primary-50 text-primary-700 border-primary-300'
                      : 'bg-surface-overlay text-neutral-500 border-transparent hover:text-neutral-700 hover:border-neutral-300'
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
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <Input
              placeholder="جستجوی کسب‌وکار..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-10"
            />
          </div>
          <div className="relative">
            <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500 pointer-events-none" />
            <Input
              placeholder="شهر..."
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="pr-10"
            />
          </div>
        </div>
      </section>

      {/* Business Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {isLoading ? (
          <FullPageSpinner />
        ) : error ? (
          <Card className="p-8">
            <EmptyState
              icon={<AlertCircle className="w-8 h-8" />}
              title="خطا در بارگذاری"
              description="لطفاً دوباره تلاش کنید"
            />
          </Card>
        ) : !data || data.businesses.length === 0 ? (
          <Card className="p-8">
            <EmptyState
              icon={<Building2 className="w-8 h-8" />}
              title="هنوز کسب‌وکاری ثبت نشده"
              description="به‌زودی کسب‌وکارهای محلی در اینجا نمایش داده می‌شوند"
            />
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {data.businesses.map((biz) => (
                <BusinessCard key={biz.id} business={biz} />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
