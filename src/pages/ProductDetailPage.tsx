import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowRight, ShoppingCart, Star, CheckCircle, XCircle, Store,
} from 'lucide-react';
import { getProductById, productCategories } from '@/lib/products';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers/useToast';

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const product = getProductById(id);
  const addItem = useCartStore((s) => s.addItem);
  const toast = useToast();
  const [quantity, setQuantity] = useState(1);

  if (!product) {
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

  const categoryLabel = productCategories.find((c) => c.id === product.category)?.label ?? product.category;

  const handleAddToCart = () => {
    addItem(product, quantity);
    toast.success(`${product.name} به سبد خرید اضافه شد`);
  };

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <Link to="/" className="hover:text-neutral-600 transition-colors">میدان شهر</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <Link to="/market" className="hover:text-neutral-600 transition-colors">فروشگاه</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="text-neutral-600 truncate">{product.name}</span>
      </nav>

      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-0">
          {/* Image */}
          <div className="aspect-square md:aspect-auto md:min-h-[360px] bg-gradient-to-br from-neutral-200 to-neutral-400 relative">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 flex items-center gap-1.5">
              {product.isNew && (
                <Badge tone="success" variant="solid">جدید</Badge>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="p-6 flex flex-col gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge tone="neutral" variant="soft">{categoryLabel}</Badge>
                <div className="flex items-center gap-1 text-sm">
                  <Star className="w-3.5 h-3.5 text-warning-600 fill-warning-500" />
                  <span className="font-num text-neutral-600">{toPersianDigits(product.rating.toFixed(1))}</span>
                  <span className="text-neutral-600 text-xs">({toPersianDigits(product.soldCount.toLocaleString('en-US'))} فروش)</span>
                </div>
              </div>
              <h1 className="text-xl font-extrabold text-neutral-800 mb-3">{product.name}</h1>
              <p className="text-sm text-neutral-500 leading-relaxed">
                {product.description}
              </p>
            </div>

            {/* Price */}
            <div className="py-3 border-y border-neutral-200">
              <p className="text-xs text-neutral-500 mb-1">قیمت محصول</p>
              <p className="text-2xl font-extrabold text-primary-700 font-num">
                {formatCurrency(product.price)}
              </p>
            </div>

            {/* Availability */}
            <div className="flex items-center gap-2 text-sm">
              {product.inStock ? (
                <>
                  <CheckCircle className="w-4 h-4 text-success-600" />
                  <span className="text-success-700">موجود در انبار</span>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-error-600" />
                  <span className="text-error-700">ناموجود</span>
                </>
              )}
            </div>

            {/* Quantity selector */}
            {product.inStock && (
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

            {/* Actions */}
            <div className="flex gap-3 mt-auto">
              <Button
                variant="primary"
                fullWidth
                size="lg"
                disabled={!product.inStock}
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
