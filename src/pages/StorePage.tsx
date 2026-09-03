import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, TrendingUp, Sparkles, ShoppingCart, Star, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { useProducts, useEffectivePrice, useProductMedia, useProductInventory } from '@/hooks/useProducts';
import { useCategories } from '@/hooks/useCategories';
import { useCartStore, type CartProduct } from '@/stores/cart-store';
import { useToast } from '@/providers/useToast';
import type { Product } from '@/types';

function ProductImage({ productId, fallbackName }: { productId: string; fallbackName: string }) {
  const { data: media } = useProductMedia(productId);
  const primary = media?.find((m) => m.isPrimary) ?? media?.[0];
  const url = primary?.url ?? '';
  return (
    <div className="aspect-[16/10] bg-gradient-to-br from-neutral-200 to-neutral-400 relative overflow-hidden">
      {url ? (
        <img
          src={url}
          alt={fallbackName}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-neutral-400">
          <Store className="w-8 h-8" />
        </div>
      )}
    </div>
  );
}

function ProductCard({ product, rank }: { product: Product; rank?: number }) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const { data: price } = useEffectivePrice(product.id);
  const { data: inventory } = useProductInventory(product.id);

  const displayPrice = price?.amount ?? 0;
  const inStock = inventory ? inventory.availableQuantity > 0 || inventory.allowBackorder : true;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: displayPrice,
      imageUrl: '',
      slug: product.slug,
    };
    addItem(cartProduct);
    toast.success('به سبد خرید اضافه شد');
  };

  return (
    <Link to={`/market/${product.slug}`} className="block group animate-fade-in-up">
      <Card hover className="p-0 overflow-hidden h-full flex flex-col">
        <ProductImage productId={product.id} fallbackName={product.name} />
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
          {product.isNew && (
            <Badge tone="success" variant="solid" className="text-[10px] px-2 py-0.5">
              جدید
            </Badge>
          )}
          {rank && (
            <Badge tone="primary" variant="solid" className="text-[10px] px-2 py-0.5 font-num">
              {toPersianDigits(rank)}
            </Badge>
          )}
        </div>

        <div className="p-3.5 flex flex-col flex-1 gap-2">
          <h3 className="text-sm font-bold text-neutral-800 leading-snug line-clamp-2">
            {product.name}
          </h3>

          {product.shortDescription && (
            <p className="text-xs text-neutral-500 line-clamp-1">{product.shortDescription}</p>
          )}

          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            <p className="text-base font-extrabold text-primary-700 font-num">
              {formatCurrency(displayPrice)}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="shrink-0 px-3 h-8"
              onClick={handleAddToCart}
              disabled={!inStock}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {inStock ? 'خرید' : 'ناموجود'}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

function ProductCardSkeleton() {
  return (
    <Card className="p-0 overflow-hidden h-full flex flex-col">
      <Skeleton className="aspect-[16/10] rounded-none" />
      <div className="p-3.5 flex flex-col gap-2">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex items-center justify-between pt-2">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-8 w-16" />
        </div>
      </div>
    </Card>
  );
}

export function StorePage() {
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const { data: categories } = useCategories({ parentId: null, onlyNav: true });
  const { data: bestSellers, isLoading: loadingBest } = useProducts({ onlyBestSellers: true, limit: 3 });
  const { data: newest, isLoading: loadingNew } = useProducts({ onlyNew: true, limit: 3 });
  const { data: categoryProducts, isLoading: loadingCategory } = useProducts(
    activeCategory !== 'all' ? { categoryId: activeCategory } : undefined,
  );

  const categoryButtons = [
    { id: 'all', name: 'همه' },
    ...(categories ?? []).map((c) => ({ id: c.id, name: c.name })),
  ];

  const showCategoryProducts = activeCategory !== 'all';
  const hasCategoryProducts = showCategoryProducts && (categoryProducts?.length ?? 0) > 0;

  return (
    <div className="animate-fade-in pb-12">
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-500/25 flex items-center justify-center">
            <Store className="w-5 h-5 text-primary-700" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-neutral-800">فروشگاه</h1>
            <p className="text-sm text-neutral-500">خرید مستقیم محصولات با بهترین قیمت</p>
          </div>
        </div>
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {categoryButtons.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-normal ${
                activeCategory === cat.id
                  ? 'bg-primary-50 text-primary-700 border border-primary-300'
                  : 'bg-surface-overlay text-neutral-500 border border-transparent hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </section>

      {showCategoryProducts && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-primary-600" />
            <h2 className="text-base font-bold text-neutral-800">محصولات دسته‌بندی</h2>
          </div>
          {loadingCategory ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : !hasCategoryProducts ? (
            <EmptyState
              icon={<Store className="w-8 h-8" />}
              title="محصولی یافت نشد"
              description="در حال حاضر محصولی در این دسته‌بندی وجود ندارد"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {categoryProducts!.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>
      )}

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-bold text-neutral-800">پرفروش‌ترین‌ها</h2>
        </div>
        {loadingBest ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (bestSellers?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<TrendingUp className="w-8 h-8" />}
            title="محصولی یافت نشد"
            description="در حال حاضر محصول پرفروشی وجود ندارد"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {bestSellers!.map((product, idx) => (
              <ProductCard key={product.id} product={product} rank={idx + 1} />
            ))}
          </div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-secondary-600" />
          <h2 className="text-base font-bold text-neutral-800">جدیدترین‌ها</h2>
        </div>
        {loadingNew ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <ProductCardSkeleton key={i} />
            ))}
          </div>
        ) : (newest?.length ?? 0) === 0 ? (
          <EmptyState
            icon={<Sparkles className="w-8 h-8" />}
            title="محصولی یافت نشد"
            description="در حال حاضر محصول جدیدی وجود ندارد"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {newest!.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
