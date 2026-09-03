import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Receipt } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatNumber, toPersianDigits } from '@/lib/persian';
import { formatJalaliShort, formatTime } from '@/lib/jalali';
import type { PaymentOrder, PaymentOrderStatus } from '@/types';

const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  pending: 'در انتظار پرداخت',
  success: 'پرداخت موفق',
  failed: 'پرداخت ناموفق',
  cancelled: 'لغو شده',
};

function getStatusTone(status: PaymentOrderStatus): 'warning' | 'success' | 'error' | 'neutral' {
  switch (status) {
    case 'pending': return 'warning';
    case 'success': return 'success';
    case 'failed': return 'error';
    case 'cancelled': return 'neutral';
  }
}

function PaidOrderItem({ order }: { order: PaymentOrder }) {
  const tone = getStatusTone(order.status);

  return (
    <div className="flex items-center gap-3 py-3 border-b border-neutral-200/60 last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="text-sm font-medium text-neutral-700">
            {order.packageId ? 'خرید پکیج' : 'شارژ دلخواه'}
          </p>
          <Badge tone={tone} variant="soft" className="text-[10px] px-2 py-0.5">
            {PAYMENT_STATUS_LABELS[order.status]}
          </Badge>
        </div>
        <p className="text-xs text-neutral-500">
          {formatJalaliShort(new Date(order.createdAt))} {toPersianDigits(formatTime(new Date(order.createdAt)))}
          {' — '}
          <span className="font-num" dir="ltr">{order.id.slice(0, 8)}</span>
        </p>
      </div>
      <div className="text-left shrink-0">
        <p className="text-sm font-bold text-neutral-700 font-num">
          {formatNumber(order.amount)}
          <span className="text-xs font-normal text-neutral-500 mr-1">پارسی</span>
        </p>
      </div>
    </div>
  );
}

interface Props {
  orders: PaymentOrder[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function PaidOrdersAccordion({ orders, isLoading, isError }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState<string>('0px');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      setMaxHeight(expanded ? `${Math.min(scrollHeight, 400)}px` : '0px');
    }
  }, [expanded, orders]);

  const count = orders?.length ?? 0;

  return (
    <div className="rounded-xl bg-surface-raised border border-neutral-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-surface-overlay/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-primary-50 border border-primary-500/20 flex items-center justify-center">
            <Receipt className="w-4.5 h-4.5 text-primary-600" />
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold text-neutral-800">سفارشات پرداختی</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {count > 0 ? `${toPersianDigits(count)} سفارش` : 'بدون سفارش'}
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            'w-5 h-5 text-neutral-400 transition-transform duration-normal',
            expanded && 'rotate-180',
          )}
        />
      </button>

      <div
        ref={contentRef}
        className="overflow-hidden transition-all duration-normal ease-out"
        style={{ maxHeight }}
      >
        <div className="px-5 pb-5">
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-error-600 py-4 text-center">خطا در بارگذاری سفارشات</p>
          ) : !orders || orders.length === 0 ? (
            <EmptyState
              icon={<Receipt className="w-7 h-7" />}
              title="سفارشی وجود ندارد"
              description="هنوز سفارش پرداختی ثبت نشده است."
              className="py-8"
            />
          ) : (
            <div>
              {orders.map((order) => (
                <PaidOrderItem key={order.id} order={order} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
