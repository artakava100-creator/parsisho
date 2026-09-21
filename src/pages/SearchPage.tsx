import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Search, Store, Building2, Gavel, ArrowRight, MapPin, Package } from 'lucide-react';
import { useSiteSearch } from '@/hooks/useSearch';
import { toPersianDigits } from '@/lib/persian';
import { Input } from '@/components/ui/Input';
import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';
import type { SearchResultProduct, SearchResultBusiness, SearchResultAuction } from '@/types';

const TAB_CONFIG = [
  { key: 'all', label: 'همه', icon: Search },
  { key: 'products', label: 'محصولات', icon: Package },
  { key: 'businesses', label: 'کسب‌وکارها', icon: Building2 },
  { key: 'auctions', label: 'مزایده‌ها', icon: Gavel },
] as const;

type TabKey = (typeof TAB_CONFIG)[number]['key'];

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryFromUrl = searchParams.get('q') ?? '';
  const [input, setInput] = useState(queryFromUrl);
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInput(queryFromUrl);
  }, [queryFromUrl]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const { data: results, isLoading, isFetching } = useSiteSearch(queryFromUrl, 10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (trimmed) {
      setSearchParams({ q: trimmed });
    } else {
      setSearchParams({});
    }
  };

  const products = results?.products ?? [];
  const businesses = results?.businesses ?? [];
  const auctions = results?.auctions ?? [];
  const totals = results?.totals ?? { products: 0, businesses: 0, auctions: 0 };
  const totalAll = totals.products + totals.businesses + totals.auctions;

  const showProducts = activeTab === 'all' || activeTab === 'products';
  const showBusinesses = activeTab === 'all' || activeTab === 'businesses';
  const showAuctions = activeTab === 'all' || activeTab === 'auctions';

  const hasQuery = queryFromUrl.trim().length > 0;

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8">
        {/* Search header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-neutral-900 mb-4">جستجو در پارسیشو</h1>
          <form onSubmit={handleSubmit} className="relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="جستجو در محصولات، کسب‌وکارها و مزایده‌ها..."
              className="pr-12 pl-4 h-14 text-base"
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition-colors"
              aria-label="جستجو"
            >
              <Search className="w-5 h-5" />
            </button>
          </form>
        </div>

        {!hasQuery ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-neutral-500">برای شروع، چیزی برای جستجو وارد کنید</p>
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Spinner className="w-8 h-8 text-primary-600" />
          </div>
        ) : totalAll === 0 ? (
          <div className="text-center py-16">
            <Search className="w-16 h-16 text-neutral-300 mx-auto mb-4" />
            <p className="text-lg font-medium text-neutral-700 mb-1">نتیجه‌ای یافت نشد</p>
            <p className="text-sm text-neutral-500">
              برای «{toPersianDigits(queryFromUrl)}» هیچ نتیجه‌ای پیدا نشد. لطفاً با کلمات دیگری امتحان کنید.
            </p>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-1">
              {TAB_CONFIG.map((tab) => {
                const count =
                  tab.key === 'all'
                    ? totalAll
                    : tab.key === 'products'
                      ? totals.products
                      : tab.key === 'businesses'
                        ? totals.businesses
                        : totals.auctions;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all',
                      activeTab === tab.key
                        ? 'bg-primary-600 text-white shadow-sm'
                        : 'bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300',
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                    <span
                      className={cn(
                        'text-xs px-1.5 py-0.5 rounded-full',
                        activeTab === tab.key
                          ? 'bg-white/20 text-white'
                          : 'bg-neutral-100 text-neutral-500',
                      )}
                    >
                      {toPersianDigits(count)}
                    </span>
                  </button>
                );
              })}
            </div>

            {isFetching && (
              <div className="text-xs text-neutral-400 mb-3 flex items-center gap-2">
                <Spinner className="w-3 h-3" />
                در حال جستجو...
              </div>
            )}

            {/* Results */}
            <div className="space-y-8">
              {showProducts && products.length > 0 && (
                <SearchSection
                  title="محصولات"
                  icon={<Package className="w-5 h-5" />}
                  count={totals.products}
                  onSeeAll={() => navigate(`/market?q=${encodeURIComponent(queryFromUrl)}`)}
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {products.map((p) => (
                      <ProductResultCard key={p.id} product={p} />
                    ))}
                  </div>
                </SearchSection>
              )}

              {showBusinesses && businesses.length > 0 && (
                <SearchSection
                  title="کسب‌وکارها"
                  icon={<Building2 className="w-5 h-5" />}
                  count={totals.businesses}
                  onSeeAll={() => navigate(`/businesses?q=${encodeURIComponent(queryFromUrl)}`)}
                >
                  <div className="space-y-2">
                    {businesses.map((b) => (
                      <BusinessResultRow key={b.id} business={b} />
                    ))}
                  </div>
                </SearchSection>
              )}

              {showAuctions && auctions.length > 0 && (
                <SearchSection
                  title="مزایده‌ها"
                  icon={<Gavel className="w-5 h-5" />}
                  count={totals.auctions}
                  onSeeAll={() => navigate(`/auctions?q=${encodeURIComponent(queryFromUrl)}`)}
                >
                  <div className="space-y-2">
                    {auctions.map((a) => (
                      <AuctionResultRow key={a.id} auction={a} />
                    ))}
                  </div>
                </SearchSection>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SearchSection({
  title,
  icon,
  count,
  onSeeAll,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  count: number;
  onSeeAll: () => void;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="flex items-center gap-2 text-lg font-bold text-neutral-800">
          <span className="text-primary-600">{icon}</span>
          {title}
          <span className="text-sm font-normal text-neutral-400">({toPersianDigits(count)})</span>
        </h2>
        <button
          onClick={onSeeAll}
          className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1 transition-colors"
        >
          مشاهده همه
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
      {children}
    </section>
  );
}

function ProductResultCard({ product }: { product: SearchResultProduct }) {
  return (
    <Link
      to={`/market/${product.slug}`}
      className="group block bg-white rounded-xl border border-neutral-200 overflow-hidden hover:shadow-md hover:border-neutral-300 transition-all"
    >
      <div className="aspect-square bg-neutral-50 overflow-hidden">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-8 h-8 text-neutral-300" />
          </div>
        )}
      </div>
      <div className="p-2.5">
        <p className="text-sm font-medium text-neutral-800 line-clamp-2 group-hover:text-primary-700 transition-colors">
          {product.name}
        </p>
        {product.category_name && (
          <p className="text-xs text-neutral-400 mt-0.5">{product.category_name}</p>
        )}
        {product.price > 0 && (
          <p className="text-sm font-bold text-primary-600 mt-1">
            {toPersianDigits(product.price.toLocaleString('fa-IR'))} تومان
          </p>
        )}
      </div>
    </Link>
  );
}

function BusinessResultRow({ business }: { business: SearchResultBusiness }) {
  return (
    <Link
      to={`/businesses/${business.slug}`}
      className="group flex items-center gap-3 bg-white rounded-xl border border-neutral-200 p-3 hover:shadow-sm hover:border-neutral-300 transition-all"
    >
      <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
        {business.logo_path ? (
          <img src={business.logo_path} alt={business.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Store className="w-5 h-5 text-neutral-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-neutral-800 group-hover:text-primary-700 transition-colors truncate">
            {business.name}
          </p>
          {business.is_featured && (
            <span className="text-xs bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full">ویژه</span>
          )}
        </div>
        <div className="flex items-center gap-2 text-xs text-neutral-400">
          <span>{business.category_name}</span>
          {business.city && (
            <span className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" />
              {business.city}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

function AuctionResultRow({ auction }: { auction: SearchResultAuction }) {
  return (
    <Link
      to={`/auctions/${auction.id}`}
      className="group flex items-center gap-3 bg-white rounded-xl border border-neutral-200 p-3 hover:shadow-sm hover:border-neutral-300 transition-all"
    >
      <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden flex-shrink-0">
        {auction.image_url ? (
          <img src={auction.image_url} alt={auction.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Gavel className="w-5 h-5 text-neutral-300" />
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-neutral-800 group-hover:text-primary-700 transition-colors truncate">
            {auction.title}
          </p>
          {auction.is_official && (
            <span className="text-xs bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded-full">رسمی</span>
          )}
        </div>
        <p className="text-xs text-neutral-400 mt-0.5">
          {auction.product_name}
        </p>
      </div>
      <div className="text-left flex-shrink-0">
        <p className="text-sm font-bold text-primary-600">
          {toPersianDigits(auction.current_price.toLocaleString('fa-IR'))}
        </p>
        <p className="text-xs text-neutral-400">تومان</p>
      </div>
    </Link>
  );
}
