import { useState } from 'react';
import { TrendingUp, Sparkles, Store } from 'lucide-react';
import { useProducts } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { MarketplaceHero } from '@/components/marketplace/MarketplaceHero';
import { CategoryNav } from '@/components/marketplace/CategoryNav';
import { ProductSection } from '@/components/marketplace/ProductSection';
import { TrustBanner } from '@/components/marketplace/TrustBanner';


export function StorePage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data: categories } = useCategories({ parentId: null, onlyNav: true });
  const { data: bestSellers, isLoading: loadingBest } = useProducts({
    onlyBestSellers: true,
    limit: 8,
  });
  const { data: newest, isLoading: loadingNew } = useProducts({
    onlyNew: true,
    limit: 8,
  });
  const { data: categoryProducts, isLoading: loadingCategory } = useProducts(
    activeCategory !== 'all' ? { categoryId: activeCategory } : undefined,
  );

  const showCategoryProducts = activeCategory !== 'all';

  return (
    <div className="animate-fade-in pb-16">
      {/* Hero */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-6">
        <MarketplaceHero />
      </div>

      {/* Category Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
        />
      </div>

      {/* Category-filtered products */}
      {showCategoryProducts && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-10">
          <ProductSection
            title="محصولات دسته‌بندی"
            icon={<Store className="w-4 h-4" />}
            products={categoryProducts}
            isLoading={loadingCategory}
            emptyIcon={<Store className="w-8 h-8" />}
            emptyTitle="محصولی یافت نشد"
            emptyDescription="در حال حاضر محصولی در این دسته‌بندی وجود ندارد"
            columns={4}
          />
        </div>
      )}

      {/* Main product sections */}
      <div id="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12 pb-12">
        {/* Best Sellers */}
        <ProductSection
          title="پرفروش‌ترین‌ها"
          icon={<TrendingUp className="w-4 h-4" />}
          products={bestSellers}
          isLoading={loadingBest}
          emptyIcon={<TrendingUp className="w-8 h-8" />}
          emptyTitle="محصولی یافت نشد"
          emptyDescription="در حال حاضر محصول پرفروشی وجود ندارد"
          columns={4}
        />

        {/* New Arrivals */}
        <ProductSection
          title="جدیدترین‌ها"
          icon={<Sparkles className="w-4 h-4" />}
          products={newest}
          isLoading={loadingNew}
          emptyIcon={<Sparkles className="w-8 h-8" />}
          emptyTitle="محصولی یافت نشد"
          emptyDescription="در حال حاضر محصول جدیدی وجود ندارد"
          columns={4}
        />

        {/* Trust Banner */}
        <TrustBanner />
      </div>
    </div>
  );
}
