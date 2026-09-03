import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Store, TrendingUp, Sparkles, ShoppingCart, Star } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { products, productCategories, type Product } from '@/lib/products';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers/useToast';

function ProductCard({ product, rank }: { product: Product; rank?: number }) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!product.inStock) return;
    addItem(product);
    toast.success('به سبد خرید اضافه شد');
  };

  return (
    <Link to={`/market/${product.id}`} className="block group animate-fade-in-up">
      <Card hover className="p-0 overflow-hidden h-full flex flex-col">
        {/* Image */}
        <div className="aspect-[16/10] bg-gradient-to-br from-neutral-200 to-neutral-400 relative overflow-hidden">
          <img
            src={product.imageUrl}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-slow ease-out"
          />
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
        </div>

        {/* Info */}
        <div className="p-3.5 flex flex-col flex-1 gap-2">
          <h3 className="text-sm font-bold text-neutral-800 leading-snug line-clamp-2">
            {product.name}
          </h3>

          <div className="flex items-center gap-2 text-xs text-neutral-500">
            <div className="flex items-center gap-0.5">
              <Star className="w-3 h-3 text-warning-600 fill-warning-500" />
              <span className="font-num text-neutral-600">{toPersianDigits(product.rating.toFixed(1))}</span>
            </div>
            <span className="text-neutral-700">|</span>
            <span>{toPersianDigits(product.soldCount.toLocaleString('en-US'))} فروش</span>
          </div>

          <div className="mt-auto pt-2 flex items-center justify-between gap-2">
            <p className="text-base font-extrabold text-primary-700 font-num">
              {formatCurrency(product.price)}
            </p>
            <Button
              variant="primary"
              size="sm"
              className="shrink-0 px-3 h-8"
              onClick={handleAddToCart}
              disabled={!product.inStock}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {product.inStock ? 'خرید' : 'ناموجود'}
            </Button>
          </div>
        </div>
      </Card>
    </Link>
  );
}

export function StorePage() {
  const [activeCategory, setActiveCategory] = useState('all');

  const bestSellers = [...products].sort((a, b) => b.soldCount - a.soldCount);
  const newest = [...products].sort((a, b) => (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0));

  return (
    <div className="animate-fade-in pb-12">
      {/* ─── Header ─── */}
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

      {/* ─── Category Filter ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
          {productCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-normal ${
                activeCategory === cat.id
                  ? 'bg-primary-50 text-primary-700 border border-primary-300'
                  : 'bg-surface-overlay text-neutral-500 border border-transparent hover:text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </section>

      {/* ─── Best Sellers ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-primary-600" />
          <h2 className="text-base font-bold text-neutral-800">پرفروش‌ترین‌ها</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {bestSellers.slice(0, 3).map((product, idx) => (
            <ProductCard key={product.id} product={product} rank={idx + 1} />
          ))}
        </div>
      </section>

      {/* ─── Newest ─── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-4 h-4 text-secondary-600" />
          <h2 className="text-base font-bold text-neutral-800">جدیدترین‌ها</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {newest.slice(0, 3).map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>
    </div>
  );
}
