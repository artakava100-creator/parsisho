import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight, ShoppingCart, CheckCircle, XCircle, Store, AlertCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
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

function ProductDetailSkeleton() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
        <Skeleton className="aspect-square md:aspect-auto md:min-h-[360px] rounded-none" />
        <div className="p-6 flex flex-col gap-4">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </Card>
  );
}

export function ProductDetailPage() {
  const { id: slug } = useParams<{ id: string }>();
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading, isError } = useProductBySlug(slug);
  const { data: media } = useProductMedia(product?.id);
  const { data: variants } = useProductVariants(product?.id);
  const { data: price } = useEffectivePrice(product?.id);
  const { data: inventory } = useProductInventory(product?.id);
  const { data: category } = useCategoryById(product?.categoryId);

  if (isLoading) {
    return (
      <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in">
        <ProductDetailSkeleton />
      </div>
    );
  }

  if (isError || !product) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<Store className="w-8 h-8" />}
          title="محصول پیدا نشد"
          description="محصول مورد نظر وجود ندارد یا حذف شده است"
          action={
            <Link to="/market">
              <Button variant="outline">
                بازگشت به فروشگاه
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  const displayPrice = price?.amount ?? 0;
  const inStock = inventory ? inventory.availableQuantity > 0 || inventory.allowBackorder : true;
  const primaryMedia = media?.find((m) => m.isPrimary) ?? media?.[0];
  const imageUrl = primaryMedia?.url ?? '';
  const categoryLabel = category?.name ?? '';

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
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in">
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <Link to="/" className="hover:text-neutral-600 transition-colors">میدان شهر</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <Link to="/market" className="hover:text-neutral-600 transition-colors">فروشگاه</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="text-neutral-600 truncate">{product.name}</span>
      </nav>

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          <div className="aspect-square md:aspect-auto md:min-h-[360px] bg-gradient-to-br from-neutral-200 to-neutral-400 relative">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={primaryMedia?.altText ?? product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-neutral-400">
                <Store className="w-12 h-12" />
              </div>
            )}
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {product.isNew && (
                <Badge tone="success" variant="solid">جدید</Badge>
              )}
            </div>
          </div>

          <div className="p-6 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {categoryLabel && (
                  <Badge tone="neutral" variant="soft">{categoryLabel}</Badge>
                )}
              </div>
              <h1 className="text-xl font-extrabold text-neutral-800 mb-3">{product.name}</h1>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {product.description ?? product.shortDescription ?? ''}
              </p>
            </div>

            {variants && variants.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-neutral-600">مدل‌ها:</p>
                <div className="flex flex-wrap gap-2">
                  {variants.map((v) => (
                    <Badge key={v.id} tone="neutral" variant="soft">{v.name}</Badge>
                  ))}
                </div>
              </div>
            )}

            <div className="py-3 border-y border-neutral-200">
              <p className="text-xs text-neutral-500 mb-1">قیمت محصول</p>
              <p className="text-2xl font-extrabold text-primary-700 font-num">
                {formatCurrency(displayPrice)}
              </p>
            </div>

            <div className="flex items-center gap-2 text-sm">
              {inStock ? (
                <>
                  <CheckCircle className="w-4 h-4 text-success-600" />
                  <span className="text-success-700">
                    {inventory ? `موجود (${toPersianDigits(inventory.availableQuantity)} عدد)` : 'موجود در انبار'}
                  </span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-error-600" />
                  <span className="text-error-700">ناموجود</span>
                </>
              )}
            </div>

            {inStock && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-neutral-500">تعداد:</span>
                <div className="flex items-center gap-1 bg-surface-overlay rounded-lg border border-neutral-300 p-0.5">
                  <button
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 transition-colors"
                    aria-label="کاهش تعداد"
                  >
                    <span className="text-lg leading-none">−</span>
                  </button>
                  <span className="w-10 text-center text-sm font-bold text-neutral-800 font-num">
                    {toPersianDigits(quantity)}
                  </span>
                  <button
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-8 h-8 flex items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 transition-colors"
                    aria-label="افزایش تعداد"
                  >
                    <span className="text-lg leading-none">+</span>
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-3 mt-auto">
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
              <Link to="/market">
                <Button variant="outline" size="lg">
                  بازگشت
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
