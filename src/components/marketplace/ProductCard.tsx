import { Link } from 'react-router-dom';
import { ShoppingCart, Store, Package } from 'lucide-react';
import { cn } from '@/lib/cn';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { useEffectivePrice, useProductMedia, useProductInventory } from '@/hooks/useProducts';
import { useCartStore, type CartProduct } from '@/stores/cart-store';
import { useToast } from '@/providers/useToast';
import { ProductBadge } from './ProductBadge';
import type { Product } from '@/types';

function ProductImage({ productId, name }: { productId: string; name: string }) {
  const { data: media } = useProductMedia(productId);
  const primary = media?.find((m) => m.isPrimary) ?? media?.[0];
  return (
    <div className="aspect-square bg-neutral-100 relative overflow-hidden">
      {primary?.url ? (
        <img
          src={primary.url}
          alt={primary.altText ?? name}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-neutral-300">
          <Store className="w-10 h-10" />
        </div>
      )}
    </div>
  );
}

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const { data: price } = useEffectivePrice(product.id);
  const { data: inventory } = useProductInventory(product.id);

  const displayPrice = price?.amount ?? 0;
  const inStock = inventory
    ? inventory.availableQuantity > 0 || inventory.allowBackorder
    : true;

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

  const hasBadge = product.isNew || product.isBestSeller;

  return (
    <Link
      to={`/market/${product.slug}`}
      className={cn('block group', className)}
    >
      <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden h-full flex flex-col transition-all duration-300 hover:border-primary-300/60 hover:shadow-md">
        {/* Image */}
        <div className="relative">
          <ProductImage productId={product.id} name={product.name} />

          {/* Badges */}
          {hasBadge && (
            <div className="absolute top-2 right-2 sm:top-2.5 sm:right-2.5 flex flex-col gap-1">
              {product.isNew && <ProductBadge type="new" />}
              {product.isBestSeller && <ProductBadge type="best-seller" />}
            </div>
          )}

          {/* Stock indicator */}
          {!inStock && (
            <div className="absolute inset-0 bg-neutral-900/40 flex items-center justify-center">
              <span className="bg-white/90 text-neutral-700 text-xs font-bold px-3 py-1.5 rounded-lg">
                ناموجود
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 sm:p-3.5 flex flex-col flex-1 gap-2">
          <h3 className="text-xs sm:text-sm font-bold text-neutral-800 leading-relaxed line-clamp-2 min-h-[2.5rem]">
            {product.name}
          </h3>

          {product.shortDescription && (
            <p className="text-[10px] sm:text-[11px] text-neutral-400 line-clamp-1">
              {product.shortDescription}
            </p>
          )}

          {/* Price + Action */}
          <div className="mt-auto pt-2.5 sm:pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
            <div className="flex flex-col">
              <span className="text-[10px] sm:text-[11px] text-neutral-400">قیمت</span>
              <span className="text-xs sm:text-sm font-extrabold text-primary-700 font-num">
                {formatCurrency(displayPrice)}
              </span>
            </div>

            <button
              onClick={handleAddToCart}
              disabled={!inStock}
              className={cn(
                'flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-bold transition-all duration-200',
                inStock
                  ? 'bg-primary-700 text-white hover:bg-primary-600 active:scale-95'
                  : 'bg-neutral-100 text-neutral-400 cursor-not-allowed',
              )}
              aria-label={inStock ? 'افزودن به سبد خرید' : 'ناموجود'}
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              {inStock ? 'خرید' : 'ناموجود'}
            </button>
          </div>
        </div>
      </div>
    </Link>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-neutral-200/80 overflow-hidden h-full flex flex-col">
      <div className="aspect-square bg-neutral-100 animate-shimmer" />
      <div className="p-3.5 flex flex-col gap-2">
        <div className="h-4 w-3/4 rounded bg-neutral-100 animate-shimmer" />
        <div className="h-3 w-1/2 rounded bg-neutral-100 animate-shimmer" />
        <div className="mt-auto pt-3 border-t border-neutral-100 flex items-center justify-between">
          <div className="h-5 w-20 rounded bg-neutral-100 animate-shimmer" />
          <div className="h-8 w-16 rounded-lg bg-neutral-100 animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
