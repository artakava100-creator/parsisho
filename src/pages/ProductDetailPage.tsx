import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight,
  ShoppingCart,
  CheckCircle,
  XCircle,
  Store,
  Minus,
  Plus,
  ChevronLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductBadge } from '@/components/marketplace/ProductBadge';
import { ProductGallery } from '@/components/marketplace/ProductGallery';
import { VariantSelector } from '@/components/marketplace/VariantSelector';
import { TrustBanner } from '@/components/marketplace/TrustBanner';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import {
  useProductBySlug,
  useProductMedia,
  useProductVariants,
  useEffectivePrice,
  useProductInventory,
} from '@/hooks/useProducts';
import { useCategoryById } from '@/hooks/useCategories';
import { useCartStore, type CartProduct } from '@/stores/cart-store';
import { useToast } from '@/providers/useToast';

function DetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <Skeleton className="aspect-square rounded-xl" />
      <div className="flex flex-col gap-4">
        <Skeleton className="h-5 w-24" />
        <Skeleton className="h-7 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-px w-full" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-12 w-full" />
      </div>
    </div>
  );
}

export function ProductDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState<string | null>(null);

  const { data: product, isLoading, isError } = useProductBySlug(slug);
  const { data: media } = useProductMedia(product?.id);
  const { data: variants } = useProductVariants(product?.id);
  const { data: price } = useEffectivePrice(product?.id);
  const { data: inventory } = useProductInventory(product?.id);
  const { data: category } = useCategoryById(product?.categoryId);

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 animate-fade-in">
        <DetailSkeleton />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <EmptyState
          icon={<Store className="w-8 h-8" />}
          title="محصول پیدا نشد"
          description="محصول مورد نظر وجود ندارد یا حذف شده است"
          action={
            <Link to="/market">
              <Button variant="outline">
                بازگشت به بازار
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const displayPrice = price?.amount ?? 0;
  const inStock = inventory
    ? inventory.availableQuantity > 0 || inventory.allowBackorder
    : true;
  const primaryMedia = media?.find((m) => m.isPrimary) ?? media?.[0];
  const imageUrl = primaryMedia?.url ?? '';

  const handleAddToCart = () => {
    const cartProduct: CartProduct = {
      id: product.id,
      name: product.name,
      price: displayPrice,
      imageUrl,
      slug: product.slug,
    };
    addItem(cartProduct, quantity);
    toast.success(`${product.name} به سبد خرید اضافه شد`);
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs sm:text-sm text-neutral-400 mb-4 sm:mb-6 overflow-x-auto scrollbar-hide">
        <Link to="/" className="shrink-0 hover:text-neutral-600 transition-colors">
          خانه
        </Link>
        <ChevronLeft className="w-3.5 h-3.5 shrink-0 rotate-180" />
        <Link to="/market" className="shrink-0 hover:text-neutral-600 transition-colors">
          بازار
        </Link>
        {category && (
          <>
            <ChevronLeft className="w-3.5 h-3.5 shrink-0 rotate-180" />
            <span className="shrink-0 text-neutral-400">{category.name}</span>
          </>
        )}
        <ChevronLeft className="w-3.5 h-3.5 shrink-0 rotate-180" />
        <span className="text-neutral-600 truncate">{product.name}</span>
      </nav>

      {/* Main content: Gallery | Info */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 mb-8 sm:mb-12">
        {/* Gallery */}
        <div>
          <ProductGallery media={media} productName={product.name} />
        </div>

        {/* Product Info */}
        <div className="flex flex-col gap-4 sm:gap-5">
          {/* Badges */}
          <div className="flex items-center gap-2 flex-wrap">
            {product.isNew && <ProductBadge type="new" />}
            {product.isBestSeller && <ProductBadge type="best-seller" />}
            {product.isSpecialOffer && <ProductBadge type="special" />}
            {category && (
              <span className="px-2.5 py-1 rounded-lg bg-neutral-100 text-neutral-500 text-xs font-medium">
                {category.name}
              </span>
            )}
          </div>

          {/* Name */}
          <h1 className="text-lg sm:text-2xl font-extrabold text-neutral-800 leading-tight">
            {product.name}
          </h1>

          {/* Description */}
          {(product.description || product.shortDescription) && (
            <p className="text-xs sm:text-sm text-neutral-500 leading-relaxed">
              {product.description ?? product.shortDescription}
            </p>
          )}

          {/* Variant selector */}
          {variants && variants.length > 0 && (
            <VariantSelector
              variants={variants}
              selectedId={selectedVariant ?? variants[0]?.id ?? null}
              onSelect={setSelectedVariant}
            />
          )}

          {/* Price */}
          <div className="py-3 sm:py-4 border-y border-neutral-200/80">
            <span className="text-xs text-neutral-400 block mb-1">قیمت محصول</span>
            <span className="text-xl sm:text-2xl font-extrabold text-primary-700 font-num">
              {formatCurrency(displayPrice)}
            </span>
          </div>

          {/* Stock */}
          <div className="flex items-center gap-2 text-sm">
            {inStock ? (
              <>
                <CheckCircle className="w-4 h-4 text-success-600" />
                <span className="text-success-700 font-medium">
                  {inventory
                    ? `موجود (${toPersianDigits(inventory.availableQuantity)} عدد)`
                    : 'موجود در انبار'}
                </span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-error-600" />
                <span className="text-error-700 font-medium">ناموجود</span>
              </>
            )}
          </div>

          {/* Quantity + Add to cart */}
          {inStock && (
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-0.5 bg-neutral-50 rounded-xl border border-neutral-200 p-1">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200 transition-colors"
                  aria-label="کاهش تعداد"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-9 text-center text-sm font-bold text-neutral-800 font-num">
                  {toPersianDigits(quantity)}
                </span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg text-neutral-500 hover:bg-neutral-200 transition-colors"
                  aria-label="افزایش تعداد"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Purchase actions */}
          <div className="flex gap-3 mt-2">
            <Button
              variant="primary"
              fullWidth
              size="lg"
              disabled={!inStock}
              onClick={handleAddToCart}
            >
              <ShoppingCart className="w-5 h-5" />
              افزودن به سبد خرید
            </Button>
          </div>

          {/* Back link */}
          <Link
            to="/market"
            className="inline-flex items-center gap-1.5 text-sm text-neutral-400 hover:text-primary-600 transition-colors mt-1"
          >
            <ArrowRight className="w-4 h-4" />
            بازگشت به بازار
          </Link>
        </div>
      </div>

      {/* Trust banner */}
      <TrustBanner />
    </div>
  );
}
