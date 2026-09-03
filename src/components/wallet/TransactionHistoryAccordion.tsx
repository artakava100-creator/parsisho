import { useState, useRef, useEffect } from 'react';
import { ChevronDown, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { toPersianDigits } from '@/lib/persian';
import { formatJalaliShort, formatTime } from '@/lib/jalali';
import type { WalletTransaction, WalletTxType, WalletTxStatus } from '@/types';

const TX_LABELS: Record<WalletTxType, string> = {
  deposit: 'شارژ',
  withdrawal: 'برداشت',
  auction_bid: 'پیشنهاد مزایده',
  auction_click: 'کلیک مزایده',
  auction_refund: 'بازگشت مزایده',
  direct_purchase: 'خرید مستقیم',
  reward: 'جایزه',
  daily_reward: 'جایزه روزانه',
  referral_reward: 'جایزه دعوت',
  admin_adjustment: 'تنظیم مدیریت',
};

const TX_STATUS_LABELS: Record<WalletTxStatus, string> = {
  pending: 'در انتظار',
  completed: 'تکمیل شده',
  failed: 'ناموفق',
  cancelled: 'لغو شده',
};

function getTxTone(type: WalletTxType): 'success' | 'error' | 'warning' | 'neutral' {
  if (type === 'deposit' || type === 'reward' || type === 'daily_reward' || type === 'referral_reward' || type === 'auction_refund')
    return 'success';
  if (type === 'auction_bid' || type === 'auction_click' || type === 'direct_purchase' || type === 'withdrawal')
    return 'error';
  if (type === 'admin_adjustment') return 'warning';
  return 'neutral';
}

function TransactionItem({ tx }: { tx: WalletTransaction }) {
  const isCredit = tx.amount > 0;
  const tone = getTxTone(tx.type);
  const Icon = isCredit ? TrendingUp : TrendingDown;
  const toneClasses: Record<string, string> = {
    success: 'bg-success-50 text-success-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
    neutral: 'bg-neutral-200/40 text-neutral-500',
  };

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-neutral-200/60 last:border-0">
      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', toneClasses[tone])}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-neutral-700">{TX_LABELS[tx.type]}</p>
          <Badge tone={tone} variant="soft" className="text-[10px] px-2 py-0.5">
            {isCredit ? 'واریز' : 'برداشت'}
          </Badge>
          {tx.status !== 'completed' && (
            <Badge tone="neutral" variant="outline" className="text-[10px] px-2 py-0.5">
              {TX_STATUS_LABELS[tx.status]}
            </Badge>
          )}
        </div>
        <p className="text-xs text-neutral-500 mt-0.5 truncate">
          {tx.description || TX_LABELS[tx.type]}
          {' — '}
          {formatJalaliShort(new Date(tx.createdAt))} {toPersianDigits(formatTime(new Date(tx.createdAt)))}
        </p>
      </div>
      <div className="text-left shrink-0">
        <p className={cn('text-sm font-bold font-num', isCredit ? 'text-success-700' : 'text-error-700')}>
          {isCredit ? '+' : ''}{toPersianDigits(Math.abs(tx.amount).toLocaleString('en-US'))}
          <span className="text-xs font-normal text-neutral-500 mr-1">پارسی</span>
        </p>
        <p className="text-xs text-neutral-600 mt-0.5 font-num">
          موجودی: {toPersianDigits(tx.balanceAfter.toLocaleString('en-US'))}
        </p>
      </div>
    </div>
  );
}

interface Props {
  transactions: WalletTransaction[] | undefined;
  isLoading: boolean;
  isError: boolean;
}

export function TransactionHistoryAccordion({ transactions, isLoading, isError }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [maxHeight, setMaxHeight] = useState<string>('0px');
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (contentRef.current) {
      const scrollHeight = contentRef.current.scrollHeight;
      setMaxHeight(expanded ? `${Math.min(scrollHeight, 400)}px` : '0px');
    }
  }, [expanded, transactions]);

  const count = transactions?.length ?? 0;

  return (
    <div className="rounded-xl bg-surface-raised border border-neutral-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-5 hover:bg-surface-overlay/50 transition-colors"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-accent-50 border border-accent-500/20 flex items-center justify-center">
            <TrendingUp className="w-4.5 h-4.5 text-accent-600" />
          </div>
          <div className="text-right">
            <h2 className="text-base font-bold text-neutral-800">تاریخچه تراکنش‌ها</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              {count > 0 ? `${toPersianDigits(count)} تراکنش` : 'بدون تراکنش'}
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
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 py-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                  <Skeleton className="h-6 w-24" />
                </div>
              ))}
            </div>
          ) : isError ? (
            <p className="text-sm text-error-600 py-4 text-center">خطا در بارگذاری تراکنش‌ها</p>
          ) : !transactions || transactions.length === 0 ? (
            <EmptyState
              icon={<TrendingUp className="w-7 h-7" />}
              title="تراکنشی وجود ندارد"
              description="هنوز تراکنشی در کیف پول شما ثبت نشده است."
              className="py-8"
            />
          ) : (
            <div>
              {transactions.map((tx) => (
                <TransactionItem key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
