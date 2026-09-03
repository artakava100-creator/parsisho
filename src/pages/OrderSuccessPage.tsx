import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle, Package, ArrowLeft, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { formatCurrency, toPersianDigits } from '@/lib/persian';
import { formatJalaliShort } from '@/lib/jalali';
import { orderService } from '@/services/order.service';
import type { StoreOrder, StoreOrderItem } from '@/types';

export function OrderSuccessPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<(StoreOrder & { items: StoreOrderItem[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    orderService.getOrderById(id).then((result) => {
      if (result.error) setError(result.error);
      else if (result.data) setOrder(result.data);
      else setError('سفارش پیدا نشد');
      setLoading(false);
    });
  }, [id]);

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner size="lg" label="در حال بارگذاری سفارش..." />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="py-8 px-4 max-w-2xl mx-auto">
        <Card className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-error-600 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-neutral-800 mb-2">خطا</h1>
          <p className="text-sm text-neutral-500 mb-6">{error ?? 'سفارش پیدا نشد'}</p>
          <Link to="/market">
            <Button variant="outline">بازگشت به فروشگاه</Button>
          </Link>
        </Card>
      </div>
    );
  }

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-3xl mx-auto animate-fade-in">
      {/* Success header */}
      <Card className="p-8 text-center mb-6">
        <div className="w-16 h-16 rounded-full bg-success-50 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-9 h-9 text-success-600" />
        </div>
        <h1 className="text-xl font-extrabold text-neutral-800 mb-2">سفارش شما ثبت شد</h1>
        <p className="text-sm text-neutral-500 mb-4">
          سفارش شما با موفقیت ثبت شد. پس از فعال‌سازی درگاه پرداخت، لینک پرداخت برای شما ارسال خواهد شد.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge tone="neutral" variant="soft">
            <Package className="w-3 h-3" />
            شماره سفارش: {order.orderNumber}
          </Badge>
          <Badge tone="warning" variant="soft">
            وضعیت پرداخت: پرداخت نشده
          </Badge>
        </div>
      </Card>

      {/* Order details */}
      <Card className="p-5 mb-6">
        <h2 className="text-sm font-bold text-neutral-800 mb-4">اقلام سفارش</h2>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                {item.productImage && (
                  <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-neutral-800 truncate">{item.productName}</p>
                <p className="text-xs text-neutral-500">
                  {toPersianDigits(item.quantity)} × {formatCurrency(item.unitPrice)}
                </p>
              </div>
              <p className="text-sm font-bold text-primary-700 font-num shrink-0">
                {formatCurrency(item.subtotal)}
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-neutral-200 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">جمع کالا</span>
            <span className="font-num text-neutral-700">{formatCurrency(order.subtotal)}</span>
          </div>
          {order.discount > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">تخفیف</span>
              <span className="font-num text-success-700">− {formatCurrency(order.discount)}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-sm">
            <span className="text-neutral-500">هزینه ارسال</span>
            {order.shippingCost === 0 ? (
              <span className="text-success-700">رایگان</span>
            ) : (
              <span className="font-num text-neutral-700">{formatCurrency(order.shippingCost)}</span>
            )}
          </div>
          {order.paymentFee > 0 && (
            <div className="flex items-center justify-between text-sm">
              <span className="text-neutral-500">کارمزد پرداخت</span>
              <span className="font-num text-neutral-700">{formatCurrency(order.paymentFee)}</span>
            </div>
          )}
          <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
            <span className="text-base font-bold text-neutral-800">مبلغ قابل پرداخت</span>
            <span className="text-lg font-extrabold text-primary-700 font-num">
              {formatCurrency(order.total)}
            </span>
          </div>
        </div>
      </Card>

      {/* Delivery info */}
      <Card className="p-5 mb-6">
        <h2 className="text-sm font-bold text-neutral-800 mb-4">اطلاعات تحویل</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-neutral-500 text-xs">نام</p>
            <p className="text-neutral-700">{order.customerName}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">موبایل</p>
            <p className="text-neutral-700" dir="ltr">{order.mobileNumber}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">استان</p>
            <p className="text-neutral-700">{order.province}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">شهر</p>
            <p className="text-neutral-700">{order.city}</p>
          </div>
          <div className="col-span-2">
            <p className="text-neutral-500 text-xs">آدرس</p>
            <p className="text-neutral-700">{order.address}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">کد پستی</p>
            <p className="text-neutral-700 font-num" dir="ltr">{toPersianDigits(order.postalCode)}</p>
          </div>
          <div>
            <p className="text-neutral-500 text-xs">تاریخ ثبت</p>
            <p className="text-neutral-700">{formatJalaliShort(new Date(order.createdAt))}</p>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Link to="/orders" className="flex-1">
          <Button variant="primary" fullWidth size="lg">
            مشاهده سفارش‌های من
          </Button>
        </Link>
        <Link to="/market">
          <Button variant="outline" size="lg">
            <ArrowLeft className="w-4 h-4" />
            ادامه خرید
          </Button>
        </Link>
      </div>
    </div>
  );
}
