import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Package, ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Skeleton } from '@/components/ui/Skeleton';
import { formatCurrency } from '@/lib/persian';
import { formatJalaliShort } from '@/lib/jalali';
import { orderService } from '@/services/order.service';
import type { StoreOrder, StoreOrderStatus, StorePaymentStatus } from '@/types';

const statusLabels: Record<StoreOrderStatus, { label: string; tone: 'neutral' | 'primary' | 'success' | 'warning' | 'error' }> = {
  pending: { label: 'در انتظار', tone: 'warning' },
  confirmed: { label: 'تأیید شده', tone: 'primary' },
  shipped: { label: 'ارسال شده', tone: 'primary' },
  delivered: { label: 'تحویل شده', tone: 'success' },
  cancelled: { label: 'لغو شده', tone: 'error' },
};

const paymentLabels: Record<StorePaymentStatus, { label: string; tone: 'warning' | 'success' | 'error' | 'neutral' }> = {
  unpaid: { label: 'پرداخت نشده', tone: 'warning' },
  pending: { label: 'در حال پرداخت', tone: 'neutral' },
  paid: { label: 'پرداخت شده', tone: 'success' },
  failed: { label: 'ناموفق', tone: 'error' },
};

export function OrderHistoryPage() {
  const [orders, setOrders] = useState<StoreOrder[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService.getOrders().then((result) => {
      setOrders(result.data);
      setLoading(false);
    });
  }, []);

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <Link to="/" className="hover:text-neutral-600 transition-colors">میدان شهر</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="text-neutral-600">سفارش‌های من</span>
      </nav>

      <h1 className="text-xl font-extrabold text-neutral-800 mb-6">سفارش‌های من</h1>

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : orders.length === 0 ? (
        <EmptyState
          icon={<Package className="w-8 h-8" />}
          title="هنوز سفارشی ثبت نکرده‌اید"
          description="سفارش‌های شما پس از خرید از فروشگاه اینجا نمایش داده می‌شوند."
          action={
            <Link to="/market">
              <Button variant="primary">
                <ShoppingBag className="w-4 h-4" />
                رفتن به فروشگاه
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const st = statusLabels[order.status];
            const pt = paymentLabels[order.paymentStatus];
            return (
              <Link key={order.id} to={`/orders/${order.id}/success`}>
                <Card hover className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Package className="w-4 h-4 text-neutral-500 shrink-0" />
                        <span className="text-sm font-bold text-neutral-800 truncate">{order.orderNumber}</span>
                      </div>
                      <p className="text-xs text-neutral-500">{formatJalaliShort(new Date(order.createdAt))}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge tone={st.tone} variant="soft">{st.label}</Badge>
                      <Badge tone={pt.tone} variant="soft">{pt.label}</Badge>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-3 border-t border-neutral-200">
                    <div className="text-xs text-neutral-500">
                      <span className="text-neutral-500">{order.customerName}</span>
                      <span className="text-neutral-700 mx-1">|</span>
                      <span>{order.province} - {order.city}</span>
                    </div>
                    <p className="text-sm font-extrabold text-primary-700 font-num">
                      {formatCurrency(order.total)}
                    </p>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
