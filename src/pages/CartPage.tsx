import { Link } from 'react-router-dom';
import {
  ArrowRight, ShoppingCart, Plus, Minus, Trash2, Store, ArrowLeft, CheckCircle,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers/useToast';

export function CartPage() {
  const { items, updateQuantity, removeItem, clear, totalPrice, totalItems } = useCartStore();
  const toast = useToast();

  const total = totalPrice();
  const count = totalItems();

  const handleRemove = (productId: string, name: string) => {
    removeItem(productId);
    toast.info(`${name} از سبد حذف شد`);
  };



  if (items.length === 0) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<ShoppingCart className="w-8 h-8" />}
          title="سبد خرید شما خالی است"
          description="محصولات مورد علاقه خود را از فروشگاه انتخاب کنید"
          action={
            <Link to="/market">
              <Button variant="primary">
                <Store className="w-4 h-4" />
                رفتن به فروشگاه
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <Link to="/" className="hover:text-neutral-600 transition-colors">میدان شهر</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <Link to="/market" className="hover:text-neutral-600 transition-colors">فروشگاه</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="text-neutral-600">سبد خرید</span>
      </nav>

      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-extrabold text-neutral-800">سبد خرید</h1>
        <button
          onClick={() => { clear(); toast.info('سبد خرید پاک شد'); }}
          className="text-sm text-neutral-500 hover:text-error-700 transition-colors"
        >
          پاک کردن سبد
        </button>
      </div>

      {/* Items */}
      <div className="space-y-3 mb-6">
        {items.map((item) => (
          <Card key={item.product.id} className="p-4">
            <div className="flex gap-4">
              {/* Image */}
              <Link to={`/market/${item.product.id}`} className="shrink-0">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-gradient-to-br from-neutral-200 to-neutral-400">
                  <img
                    src={item.product.imageUrl}
                    alt={item.product.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </Link>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <Link to={`/market/${item.product.id}`}>
                  <h3 className="text-sm font-bold text-neutral-800 hover:text-primary-700 transition-colors line-clamp-1">
                    {item.product.name}
                  </h3>
                </Link>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {formatCurrency(item.product.price)}
                </p>

                <div className="flex items-center justify-between mt-3">
                  {/* Quantity */}
                  <div className="flex items-center gap-1 bg-surface-overlay rounded-lg border border-neutral-300 p-0.5">
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 transition-colors"
                      aria-label="کاهش تعداد"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold text-neutral-800 font-num">
                      {toPersianDigits(item.quantity)}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                      className="w-7 h-7 flex items-center justify-center rounded-md text-neutral-600 hover:bg-neutral-200 transition-colors"
                      aria-label="افزایش تعداد"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Price + Remove */}
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-extrabold text-primary-700 font-num">
                      {formatCurrency(item.product.price * item.quantity)}
                    </p>
                    <button
                      onClick={() => handleRemove(item.product.id, item.product.name)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-error-700 hover:bg-error-50 transition-colors"
                      aria-label="حذف از سبد"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="p-5">
        <div className="space-y-2 mb-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">تعداد اقلام</span>
            <span className="font-num text-neutral-700">{toPersianDigits(count)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">هزینه ارسال</span>
            <span className="text-neutral-500 text-xs">در مرحله ثبت سفارش محاسبه می‌شود</span>
          </div>
          <div className="border-t border-neutral-200 pt-2 flex items-center justify-between">
            <span className="text-base font-bold text-neutral-800">مبلغ قابل پرداخت</span>
            <span className="text-xl font-extrabold text-primary-700 font-num">
              {formatCurrency(total)}
            </span>
          </div>
        </div>

        <div className="flex gap-3">
          <Link to="/checkout" className="flex-1">
            <Button variant="primary" fullWidth size="lg">
              <CheckCircle className="w-5 h-5" />
              ادامه ثبت سفارش
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <Link to="/market">
            <Button variant="outline" size="lg">
              ادامه خرید
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
