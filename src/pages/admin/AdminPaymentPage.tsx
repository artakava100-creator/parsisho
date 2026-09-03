import { useState } from 'react';
import { CreditCard, Clock, CheckCircle2, XCircle, AlertCircle, Search } from 'lucide-react';
import { useAdminPaymentOrders } from '@/hooks/useAdminPayment';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { formatNumber, toPersianDigits } from '@/lib/persian';
import { formatJalaliShort, formatTime } from '@/lib/jalali';
import type { PaymentOrder, PaymentOrderStatus } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'همه' },
  { value: 'pending', label: 'در انتظار' },
  { value: 'success', label: 'موفق' },
  { value: 'failed', label: 'ناموفق' },
  { value: 'cancelled', label: 'لغو شده' },
];

const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  pending: 'در انتظار پرداخت',
  success: 'پرداخت موفق',
  failed: 'پرداخت ناموفق',
  cancelled: 'لغو شده',
};

function getPaymentStatusTone(status: PaymentOrderStatus): 'warning' | 'success' | 'error' | 'neutral' {
  switch (status) {
    case 'pending': return 'warning';
    case 'success': return 'success';
    case 'failed': return 'error';
    case 'cancelled': return 'neutral';
  }
}

function SummaryCards({ orders }: { orders: PaymentOrder[] }) {
  const pending = orders.filter((o) => o.status === 'pending');
  const successful = orders.filter((o) => o.status === 'success');
  const failed = orders.filter((o) => o.status === 'failed');
  const totalValue = successful.reduce((sum, o) => sum + o.amount, 0);

  const cards = [
    { label: 'در انتظار', count: pending.length, icon: Clock, tone: 'warning' as const },
    { label: 'موفق', count: successful.length, icon: CheckCircle2, tone: 'success' as const },
    { label: 'ناموفق', count: failed.length, icon: XCircle, tone: 'error' as const },
    { label: 'مجموع موفق', count: totalValue, icon: CreditCard, tone: 'primary' as const, isValue: true },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const toneClasses: Record<string, string> = {
          warning: 'bg-warning-50 text-warning-600 border-warning-500/20',
          success: 'bg-success-50 text-success-600 border-success-500/20',
          error: 'bg-error-50 text-error-600 border-error-500/20',
          primary: 'bg-primary-50 text-primary-600 border-primary-500/20',
        };
        return (
          <Card key={card.label} className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${toneClasses[card.tone]}`}>
                <Icon className="w-4 h-4" />
              </div>
              <p className="text-xs text-neutral-500">{card.label}</p>
            </div>
            <p className="text-xl font-extrabold text-neutral-800 font-num">
              {card.isValue ? formatNumber(card.count) : toPersianDigits(card.count)}
              {card.isValue && <span className="text-xs font-normal text-neutral-500 mr-1">پارسی</span>}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

function PaymentOrderRow({ order }: { order: PaymentOrder }) {
  const tone = getPaymentStatusTone(order.status);
  const toneClasses: Record<string, string> = {
    success: 'bg-success-50 text-success-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
    neutral: 'bg-neutral-200/40 text-neutral-500',
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 py-3.5 border-b border-neutral-200/60 last:border-0">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
        <CreditCard className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-neutral-700 font-num" dir="ltr">
            {order.id.slice(0, 8)}
          </p>
          <Badge tone={tone} variant="soft" className="text-[10px]">
            {PAYMENT_STATUS_LABELS[order.status]}
          </Badge>
        </div>
        <p className="text-xs text-neutral-500 mt-0.5">
          {formatJalaliShort(new Date(order.createdAt))} {toPersianDigits(formatTime(new Date(order.createdAt)))}
          {order.gateway && ` — ${order.gateway}`}
          {order.gatewayReference && ` — ${order.gatewayReference}`}
        </p>
      </div>
      <div className="text-left shrink-0">
        <p className="text-sm font-bold text-neutral-700 font-num">
          {formatNumber(order.amount)}
          <span className="text-xs font-normal text-neutral-500 mr-1">پارسی</span>
        </p>
        {order.paidAt && (
          <p className="text-xs text-success-600 mt-0.5">
            پرداخت: {formatJalaliShort(new Date(order.paidAt))}
          </p>
        )}
        {order.failedAt && (
          <p className="text-xs text-error-600 mt-0.5">
            ناموفق: {formatJalaliShort(new Date(order.failedAt))}
          </p>
        )}
      </div>
    </div>
  );
}

export function AdminPaymentPage() {
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');
  const { data, isLoading, error } = useAdminPaymentOrders(statusFilter === 'all' ? undefined : statusFilter);

  if (isLoading) return <FullPageSpinner />;

  if (error) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<AlertCircle className="w-8 h-8" />}
          title="خطا در بارگذاری"
          description="لطفاً دوباره تلاش کنید"
        />
      </div>
    );
  }

  const orders = data?.orders ?? [];
  const total = data?.total ?? 0;

  const filtered = search.trim()
    ? orders.filter(
        (o) =>
          o.id.toLowerCase().includes(search.toLowerCase()) ||
          (o.gatewayReference ?? '').toLowerCase().includes(search.toLowerCase()),
      )
    : orders;

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-800">مدیریت پرداخت‌ها</h1>
          <p className="text-sm text-neutral-500">مشاهده و نظارت بر سفارش‌های پرداخت</p>
        </div>
      </div>

      <SummaryCards orders={orders} />

      <Card className="p-5 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Input
              placeholder="جستجو بر اساس شناسه یا مرجع درگاه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              dir="rtl"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {STATUS_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                variant={statusFilter === opt.value ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setStatusFilter(opt.value)}
              >
                {opt.label}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-neutral-500" />
            <h2 className="text-sm font-bold text-neutral-800">
              {toPersianDigits(filtered.length)} از {toPersianDigits(total)} سفارش
            </h2>
          </div>
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="w-8 h-8" />}
            title="سفارشی وجود ندارد"
            description="هیچ سفارش پرداختی با این فیلتر پیدا نشد"
          />
        ) : (
          <div>
            {filtered.map((order) => (
              <PaymentOrderRow key={order.id} order={order} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
