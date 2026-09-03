import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  ArrowDownToLine,
  ArrowUpFromLine,
  Lock,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Receipt,
  Sparkles,
  Gift,
  Clock,
  XCircle,
  CreditCard,
} from 'lucide-react';
import {
  useWallet,
  useWalletTransactions,
  useParsiPackages,
  useCreatePaymentOrder,
  useCreateCustomPaymentOrder,
  useConfirmPayment,
  useCancelPaymentOrder,
  usePaymentOrders,
} from '@/hooks/useWallet';
import { useToast } from '@/providers/useToast';
import { normalizeError } from '@/services/api-error';
import { isGatewayConfigured, gatewayNotConfiguredMessage } from '@/lib/payment-gateway';
import { formatCurrency, formatNumber, toPersianDigits, parsePersianNumber } from '@/lib/persian';
import { formatJalaliShort, formatTime } from '@/lib/jalali';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import type { WalletTransaction, WalletTxType, WalletTxStatus, ParsiPackage, PaymentOrder, PaymentOrderStatus } from '@/types';

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

const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  pending: 'در انتظار پرداخت',
  success: 'پرداخت موفق',
  failed: 'پرداخت ناموفق',
  cancelled: 'لغو شده',
};

function getTxIcon(type: WalletTxType) {
  return type === 'deposit' || type === 'reward' || type === 'daily_reward' ||
    type === 'referral_reward' || type === 'auction_refund'
    ? TrendingUp
    : TrendingDown;
}

function getTxTone(type: WalletTxType): 'success' | 'error' | 'warning' | 'primary' | 'accent' | 'neutral' {
  if (type === 'deposit' || type === 'reward' || type === 'daily_reward' || type === 'referral_reward' || type === 'auction_refund')
    return 'success';
  if (type === 'auction_bid' || type === 'auction_click' || type === 'direct_purchase' || type === 'withdrawal')
    return 'error';
  if (type === 'admin_adjustment') return 'warning';
  return 'neutral';
}

function getPaymentStatusTone(status: PaymentOrderStatus): 'warning' | 'success' | 'error' | 'neutral' {
  switch (status) {
    case 'pending': return 'warning';
    case 'success': return 'success';
    case 'failed': return 'error';
    case 'cancelled': return 'neutral';
  }
}

function getPaymentStatusIcon(status: PaymentOrderStatus) {
  switch (status) {
    case 'pending': return Clock;
    case 'success': return CheckCircle2;
    case 'failed': return XCircle;
    case 'cancelled': return XCircle;
  }
}

function PremiumBalanceCard({ wallet, isLoading }: { wallet: ReturnType<typeof useWallet>['data']; isLoading: boolean }) {
  const available = wallet?.availableBalance ?? 0;
  const locked = wallet?.lockedBalance ?? 0;
  const total = available + locked;

  return (
    <div className="relative group">
      <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-surface-raised via-surface-overlay to-surface-raised border border-neutral-300/50 shadow-lg transition-all duration-slow">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-700/8 via-transparent to-primary-700/5" />
        <div className="absolute -top-20 -right-20 w-72 h-72 bg-primary-50 rounded-full blur-[100px]" />
        <div className="absolute -bottom-16 -left-16 w-56 h-56 bg-primary-700/8 rounded-full blur-[80px]" />

        <div className="relative p-6 sm:p-8">
          <div className="flex items-start justify-between mb-8">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-primary">
                <span className="text-neutral-800 font-extrabold text-lg">پ</span>
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-800">پارسیشو</p>
                <p className="text-[10px] text-neutral-500">بانک پارسی</p>
              </div>
            </div>
            <div className="relative">
              <div className="w-11 h-8 rounded-md bg-gradient-to-br from-primary-300/30 to-primary-500/20 border border-primary-400/30 flex items-center justify-center">
                <div className="w-7 h-5 rounded-sm border border-primary-400/20 grid grid-cols-3 grid-rows-2 gap-px">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-primary-400/10" />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-1.5 mb-2">
              <WalletIcon className="w-4 h-4 text-primary-600" />
              <p className="text-xs text-neutral-500">موجودی قابل استفاده</p>
            </div>
            {isLoading ? (
              <Skeleton className="h-10 w-56" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-extrabold text-neutral-800 font-num tracking-tight">
                  {formatNumber(available)}
                </span>
                <span className="text-sm font-medium text-primary-700">پارسی</span>
              </div>
            )}
          </div>

          <div className="mb-6 flex items-center gap-2 font-num text-sm text-neutral-600 tracking-widest" dir="ltr">
            <span>۶۲۱۹</span>
            <span className="text-neutral-700">••••</span>
            <span className="text-neutral-700">••••</span>
            <span>پارسی</span>
          </div>

          <div className="flex items-center gap-3 pt-4 border-t border-neutral-200/40">
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-200/40">
              <Lock className="w-3.5 h-3.5 text-warning-600" />
              <div>
                <p className="text-[10px] text-neutral-500">مسدود</p>
                {isLoading ? (
                  <Skeleton className="h-3.5 w-16 mt-0.5" />
                ) : (
                  <p className="text-xs font-bold text-neutral-700 font-num">
                    {formatNumber(locked)} <span className="text-neutral-500 font-normal">پارسی</span>
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-200/40">
              <WalletIcon className="w-3.5 h-3.5 text-primary-600" />
              <div>
                <p className="text-[10px] text-neutral-500">کل</p>
                {isLoading ? (
                  <Skeleton className="h-3.5 w-16 mt-0.5" />
                ) : (
                  <p className="text-xs font-bold text-neutral-700 font-num">
                    {formatNumber(total)} <span className="text-neutral-500 font-normal">پارسی</span>
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function PackageCard({ pkg, onPurchase }: { pkg: ParsiPackage; onPurchase: () => void }) {
  const hasBonus = pkg.bonusAmount > 0;
  const totalAmount = pkg.parsiAmount + pkg.bonusAmount;

  return (
    <Card className="p-5 flex flex-col items-center text-center group transition-all duration-normal hover:border-primary-300" hover>
      {hasBonus && (
        <div className="absolute -top-3 right-4">
          <Badge tone="success" variant="solid" className="text-[10px] px-2.5 py-1 shadow-md">
            <Gift className="w-3 h-3" />
            {toPersianDigits(pkg.bonusAmount.toLocaleString('en-US'))} بونوس
          </Badge>
        </div>
      )}

      <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-500/20 flex items-center justify-center mb-4 group-hover:bg-primary-50 transition-colors">
        <WalletIcon className="w-6 h-6 text-primary-600" />
      </div>

      <p className="text-2xl font-extrabold text-neutral-800 font-num mb-1">
        {formatNumber(pkg.parsiAmount)}
      </p>
      <p className="text-xs text-neutral-500 mb-1">پارسی</p>

      {hasBonus && (
        <p className="text-xs text-success-600 font-medium mb-2">
          مجموع: {formatNumber(totalAmount)} پارسی
        </p>
      )}

      <div className="w-full my-3 border-t border-neutral-200/50" />

      <p className="text-sm text-neutral-500 mb-1">مبلغ پرداختی</p>
      <p className="text-base font-bold text-neutral-700 font-num mb-4">
        {formatNumber(pkg.price)} <span className="text-xs font-normal text-neutral-500">پارسی</span>
      </p>

      <Button variant="primary" fullWidth size="sm" onClick={onPurchase}>
        <CreditCard className="w-4 h-4" />
        شارژ کیف پول
      </Button>
    </Card>
  );
}

type PaymentState = 'idle' | 'creating_order' | 'order_created' | 'gateway_redirect' | 'confirming' | 'success' | 'gateway_not_configured' | 'error';

function PackageGrid() {
  const { data: packages, isLoading } = useParsiPackages();
  const createOrder = useCreatePaymentOrder();
  const confirmPayment = useConfirmPayment();
  const cancelOrder = useCancelPaymentOrder();
  const toast = useToast();
  const [confirmPkg, setConfirmPkg] = useState<ParsiPackage | null>(null);
  const [paymentState, setPaymentState] = useState<PaymentState>('idle');
  const [activeOrder, setActiveOrder] = useState<PaymentOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handlePurchase = async () => {
    if (!confirmPkg) return;
    setPaymentState('creating_order');
    setErrorMsg(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const result = await createOrder.mutateAsync({
        packageId: confirmPkg.id,
        idempotencyKey,
      });

      if (!result.success || !result.paymentOrder) {
        setErrorMsg(result.error ?? 'خطا در ایجاد سفارش پرداخت');
        setPaymentState('error');
        return;
      }

      setActiveOrder(result.paymentOrder);
      setPaymentState('order_created');

      if (!isGatewayConfigured()) {
        setPaymentState('gateway_not_configured');
        return;
      }

      setPaymentState('gateway_redirect');
    } catch (err) {
      const normalized = normalizeError(err);
      setErrorMsg(normalized.message);
      setPaymentState('error');
    }
  };

  const handleConfirm = async () => {
    if (!activeOrder) return;
    setPaymentState('confirming');
    setErrorMsg(null);

    try {
      const result = await confirmPayment.mutateAsync(activeOrder.id);

      if (result.success) {
        setPaymentState('success');
        toast.success('پرداخت موفق', `${formatCurrency(confirmPkg?.parsiAmount ?? 0 + (confirmPkg?.bonusAmount ?? 0))} به کیف پول شما اضافه شد`);
      } else if (result.code === 'gateway_not_configured') {
        setPaymentState('gateway_not_configured');
        setErrorMsg(result.error ?? gatewayNotConfiguredMessage);
      } else {
        setErrorMsg(result.error ?? 'خطا در تأیید پرداخت');
        setPaymentState('error');
      }
    } catch (err) {
      const normalized = normalizeError(err);
      setErrorMsg(normalized.message);
      setPaymentState('error');
    }
  };

  const handleCancel = async () => {
    if (!activeOrder) return;
    try {
      await cancelOrder.mutateAsync(activeOrder.id);
      toast.info('سفارش لغو شد', 'سفارش پرداخت لغو شد');
    } catch {
      // ignore
    }
    resetModal();
  };

  const resetModal = () => {
    setConfirmPkg(null);
    setPaymentState('idle');
    setActiveOrder(null);
    setErrorMsg(null);
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-5">
            <Skeleton className="w-12 h-12 rounded-xl mx-auto mb-4" />
            <Skeleton className="h-8 w-24 mx-auto mb-2" />
            <Skeleton className="h-3 w-12 mx-auto mb-4" />
            <Skeleton className="h-9 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (!packages || packages.length === 0) {
    return (
      <Card className="p-8">
        <EmptyState
          icon={<WalletIcon className="w-8 h-8" />}
          title="پکیجی موجود نیست"
          description="در حال حاضر پکیج شارژی موجود نیست. بعداً تلاش کنید."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => (
          <PackageCard
            key={pkg.id}
            pkg={pkg}
            onPurchase={() => {
              setConfirmPkg(pkg);
              setPaymentState('idle');
            }}
          />
        ))}
      </div>

      <Modal open={confirmPkg !== null} onClose={resetModal} size="sm">
        <div className="text-center py-2">
          {paymentState === 'idle' && (
            <>
              <div className="w-14 h-14 rounded-xl bg-primary-50 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-7 h-7 text-primary-600" />
              </div>
              <h3 className="text-lg font-bold text-neutral-800 mb-2">تأیید خرید پکیج</h3>
              <p className="text-sm text-neutral-500 mb-1">
                خرید <span className="font-bold text-primary-700">{formatCurrency(confirmPkg?.parsiAmount ?? 0)}</span>
              </p>
              {confirmPkg && confirmPkg.bonusAmount > 0 && (
                <p className="text-sm text-success-600 mb-1">
                  به‌علاوه {formatNumber(confirmPkg.bonusAmount)} پارسی بونوس
                </p>
              )}
              <p className="text-sm text-neutral-500 mb-1">
                مبلغ پرداختی: {formatNumber(confirmPkg?.price ?? 0)} پارسی
              </p>
              <div className="flex gap-3 mt-6">
                <Button variant="primary" fullWidth onClick={handlePurchase}>
                  ادامه پرداخت
                </Button>
                <Button variant="ghost" onClick={resetModal}>انصراف</Button>
              </div>
            </>
          )}

          {paymentState === 'creating_order' && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-full border-2 border-primary-400 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-sm text-neutral-500">در حال ایجاد سفارش پرداخت...</p>
            </div>
          )}

          {paymentState === 'order_created' && (
            <div className="py-4">
              <CheckCircle2 className="w-12 h-12 text-success-600 mx-auto mb-4" />
              <p className="text-sm text-neutral-500 mb-4">سفارش پرداخت ایجاد شد</p>
              <Button variant="primary" fullWidth onClick={handleConfirm}>
                تأیید پرداخت
              </Button>
            </div>
          )}

          {paymentState === 'gateway_redirect' && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-primary-600" />
              </div>
              <p className="text-sm text-neutral-500 mb-4">در حال انتقال به درگاه پرداخت...</p>
              <Button variant="primary" fullWidth onClick={handleConfirm} loading={confirmPayment.isPending}>
                تأیید بازگشت از درگاه
              </Button>
            </div>
          )}

          {paymentState === 'confirming' && (
            <div className="py-4">
              <div className="w-12 h-12 rounded-full border-2 border-primary-400 border-t-transparent animate-spin mx-auto mb-4" />
              <p className="text-sm text-neutral-500">در حال تأیید پرداخت...</p>
            </div>
          )}

          {paymentState === 'success' && (
            <div className="py-4">
              <CheckCircle2 className="w-16 h-16 text-success-600 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-neutral-800 mb-2">پرداخت موفق</h3>
              <p className="text-sm text-neutral-500 mb-4">
                {formatCurrency((confirmPkg?.parsiAmount ?? 0) + (confirmPkg?.bonusAmount ?? 0))} به کیف پول شما اضافه شد
              </p>
              <Button variant="primary" fullWidth onClick={resetModal}>باشه</Button>
            </div>
          )}

          {paymentState === 'gateway_not_configured' && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-xl bg-warning-50 border border-warning-500/20 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-7 h-7 text-warning-600" />
              </div>
              <h3 className="text-base font-bold text-neutral-800 mb-2">درگاه پرداخت فعال نیست</h3>
              <p className="text-sm text-neutral-500 mb-2">
                سفارش پرداخت با موفقیت ایجاد شد، اما درگاه پرداخت هنوز فعال نشده است.
              </p>
              <p className="text-xs text-neutral-500 mb-4">
                پس از فعال‌سازی درگاه، می‌توانید پرداخت را تکمیل کنید.
              </p>
              {activeOrder && (
                <div className="p-3 rounded-lg bg-neutral-100/50 border border-neutral-300/50 mb-4 text-right">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-neutral-500">شناسه سفارش</span>
                    <span className="text-neutral-600 font-num" dir="ltr">{activeOrder.id.slice(0, 8)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">وضعیت</span>
                    <Badge tone="warning" variant="soft">{PAYMENT_STATUS_LABELS[activeOrder.status]}</Badge>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="ghost" fullWidth onClick={handleCancel} loading={cancelOrder.isPending}>
                  لغو سفارش
                </Button>
                <Button variant="outline" onClick={resetModal}>بستن</Button>
              </div>
            </div>
          )}

          {paymentState === 'error' && (
            <div className="py-4">
              <div className="w-14 h-14 rounded-xl bg-error-50 border border-error-500/20 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-7 h-7 text-error-600" />
              </div>
              <h3 className="text-base font-bold text-neutral-800 mb-2">خطا</h3>
              <p className="text-sm text-error-700 mb-4">{errorMsg}</p>
              <Button variant="primary" fullWidth onClick={resetModal}>باشه</Button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}

function TransactionItem({ tx }: { tx: WalletTransaction }) {
  const Icon = getTxIcon(tx.type);
  const tone = getTxTone(tx.type);
  const isCredit = tx.amount > 0;
  const toneClasses: Record<string, string> = {
    success: 'bg-success-50 text-success-600',
    error: 'bg-error-50 text-error-600',
    warning: 'bg-warning-50 text-warning-600',
    primary: 'bg-primary-50 text-primary-600',
    accent: 'bg-accent-50 text-accent-600',
    neutral: 'bg-neutral-200/40 text-neutral-500',
  };

  return (
    <div className="flex items-center gap-3 py-3.5 border-b border-neutral-200/60 last:border-0">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
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
        <p className={`text-sm font-bold font-num ${isCredit ? 'text-success-700' : 'text-error-700'}`}>
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

function RecentPaymentOrders() {
  const { data: orders, isLoading } = usePaymentOrders();

  if (isLoading || !orders || orders.length === 0) return null;

  return (
    <Card className="p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-neutral-500" />
          <h2 className="text-lg font-bold text-neutral-800">سفارش‌های پرداخت</h2>
        </div>
        <Badge tone="neutral" variant="soft">
          {toPersianDigits(orders.length)} سفارش
        </Badge>
      </div>
      <div>
        {orders.slice(0, 5).map((order) => {
          const StatusIcon = getPaymentStatusIcon(order.status);
          const tone = getPaymentStatusTone(order.status);
          const toneClasses: Record<string, string> = {
            success: 'bg-success-50 text-success-600',
            error: 'bg-error-50 text-error-600',
            warning: 'bg-warning-50 text-warning-600',
            neutral: 'bg-neutral-200/40 text-neutral-500',
          };
          return (
            <div key={order.id} className="flex items-center gap-3 py-3 border-b border-neutral-200/60 last:border-0">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${toneClasses[tone]}`}>
                <StatusIcon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-neutral-700">
                  {PAYMENT_STATUS_LABELS[order.status]}
                </p>
                <p className="text-xs text-neutral-500 mt-0.5">
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
        })}
      </div>
    </Card>
  );
}

const CUSTOM_MIN_AMOUNT = 10_000;
const CUSTOM_QUICK_AMOUNTS = [50_000, 100_000, 200_000, 500_000];

type CustomTopUpState = 'idle' | 'creating_order' | 'order_created' | 'gateway_redirect' | 'confirming' | 'success' | 'gateway_not_configured' | 'error';

function CustomTopUpModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [amount, setAmount] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paymentState, setPaymentState] = useState<CustomTopUpState>('idle');
  const [activeOrder, setActiveOrder] = useState<PaymentOrder | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const createOrder = useCreateCustomPaymentOrder();
  const confirmPayment = useConfirmPayment();
  const cancelOrder = useCancelPaymentOrder();
  const toast = useToast();

  const resetModal = () => {
    setPaymentState('idle');
    setActiveOrder(null);
    setErrorMsg(null);
    setAmount('');
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  const handleCreateOrder = async () => {
    setError(null);
    const value = parsePersianNumber(amount);
    if (isNaN(value) || value <= 0) {
      setError('مبلغ نامعتبر است');
      return;
    }
    if (value < CUSTOM_MIN_AMOUNT) {
      setError(`حداقل مبلغ شارژ ${toPersianDigits(CUSTOM_MIN_AMOUNT.toLocaleString('en-US'))} پارسی است`);
      return;
    }
    if (!Number.isInteger(value)) {
      setError('مبلغ باید عدد صحیح باشد');
      return;
    }

    setPaymentState('creating_order');
    setErrorMsg(null);

    const idempotencyKey = crypto.randomUUID();

    try {
      const result = await createOrder.mutateAsync({ amount: value, idempotencyKey });

      if (!result.success || !result.paymentOrder) {
        setErrorMsg(result.error ?? 'خطا در ایجاد سفارش پرداخت');
        setPaymentState('error');
        return;
      }

      setActiveOrder(result.paymentOrder);
      setPaymentState('order_created');

      if (!isGatewayConfigured()) {
        setPaymentState('gateway_not_configured');
        return;
      }

      setPaymentState('gateway_redirect');
    } catch (err) {
      const normalized = normalizeError(err);
      setErrorMsg(normalized.message);
      setPaymentState('error');
    }
  };

  const handleConfirm = async () => {
    if (!activeOrder) return;
    setPaymentState('confirming');
    setErrorMsg(null);

    try {
      const result = await confirmPayment.mutateAsync(activeOrder.id);

      if (result.success) {
        setPaymentState('success');
        toast.success('پرداخت موفق', `${formatCurrency(activeOrder.amount)} به کیف پول شما اضافه شد`);
      } else if (result.code === 'gateway_not_configured') {
        setPaymentState('gateway_not_configured');
        setErrorMsg(result.error ?? gatewayNotConfiguredMessage);
      } else {
        setErrorMsg(result.error ?? 'خطا در تأیید پرداخت');
        setPaymentState('error');
      }
    } catch (err) {
      const normalized = normalizeError(err);
      setErrorMsg(normalized.message);
      setPaymentState('error');
    }
  };

  const handleCancel = async () => {
    if (!activeOrder) return;
    try {
      await cancelOrder.mutateAsync(activeOrder.id);
      toast.info('سفارش لغو شد', 'سفارش پرداخت لغو شد');
    } catch {
      // ignore
    }
    handleClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="شارژ مبلغ دلخواه" size="sm">
      <div className="space-y-5">
        {paymentState === 'idle' && (
          <>
            <div className="w-14 h-14 rounded-xl bg-primary-50 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <ArrowDownToLine className="w-7 h-7 text-primary-600" />
            </div>

            <Input
              label="مبلغ شارژ (پارسی)"
              type="text"
              inputMode="numeric"
              placeholder="مثلاً ۱۰۰٬۰۰۰"
              dir="ltr"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                if (error) setError(null);
              }}
              error={error ?? undefined}
              hint={`حداقل مبلغ: ${toPersianDigits(CUSTOM_MIN_AMOUNT.toLocaleString('en-US'))} پارسی`}
            />

            <div className="grid grid-cols-4 gap-2">
              {CUSTOM_QUICK_AMOUNTS.map((amt) => (
                <button
                  key={amt}
                  onClick={() => {
                    setAmount(toPersianDigits(amt.toLocaleString('en-US')));
                    if (error) setError(null);
                  }}
                  className="px-2 py-2 rounded-lg bg-surface-overlay border border-neutral-300 hover:border-primary-400 text-sm text-neutral-600 hover:text-primary-700 transition-colors font-num"
                >
                  {toPersianDigits((amt / 1000).toFixed(0))} ه
                </button>
              ))}
            </div>

            <div className="flex gap-3">
              <Button variant="primary" fullWidth onClick={handleCreateOrder} loading={createOrder.isPending}>
                {!createOrder.isPending && <CreditCard className="w-4 h-4" />}
                ادامه پرداخت
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                انصراف
              </Button>
            </div>
          </>
        )}

        {paymentState === 'creating_order' && (
          <div className="py-4">
            <div className="w-12 h-12 rounded-full border-2 border-primary-400 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500 text-center">در حال ایجاد سفارش پرداخت...</p>
          </div>
        )}

        {paymentState === 'order_created' && (
          <div className="py-4 text-center">
            <CheckCircle2 className="w-12 h-12 text-success-600 mx-auto mb-4" />
            <p className="text-sm text-neutral-500 mb-4">سفارش پرداخت ایجاد شد</p>
            <Button variant="primary" fullWidth onClick={handleConfirm}>
              تأیید پرداخت
            </Button>
          </div>
        )}

        {paymentState === 'gateway_redirect' && (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-primary-50 border border-primary-500/20 flex items-center justify-center mx-auto mb-4">
              <CreditCard className="w-6 h-6 text-primary-600" />
            </div>
            <p className="text-sm text-neutral-500 mb-4">در حال انتقال به درگاه پرداخت...</p>
            <Button variant="primary" fullWidth onClick={handleConfirm} loading={confirmPayment.isPending}>
              تأیید بازگشت از درگاه
            </Button>
          </div>
        )}

        {paymentState === 'confirming' && (
          <div className="py-4 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-primary-400 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-sm text-neutral-500">در حال تأیید پرداخت...</p>
          </div>
        )}

        {paymentState === 'success' && (
          <div className="py-4 text-center">
            <CheckCircle2 className="w-16 h-16 text-success-600 mx-auto mb-4" />
            <h3 className="text-lg font-bold text-neutral-800 mb-2">پرداخت موفق</h3>
            <p className="text-sm text-neutral-500 mb-4">
              {activeOrder && formatCurrency(activeOrder.amount)} به کیف پول شما اضافه شد
            </p>
            <Button variant="primary" fullWidth onClick={handleClose}>باشه</Button>
          </div>
        )}

        {paymentState === 'gateway_not_configured' && (
          <div className="py-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-warning-50 border border-warning-500/20 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7 text-warning-600" />
            </div>
            <h3 className="text-base font-bold text-neutral-800 mb-2">درگاه پرداخت فعال نیست</h3>
            <p className="text-sm text-neutral-500 mb-2">
              سفارش پرداخت با موفقیت ایجاد شد، اما درگاه پرداخت هنوز فعال نشده است.
            </p>
            <p className="text-xs text-neutral-500 mb-4">
              پس از فعال‌سازی درگاه، می‌توانید پرداخت را تکمیل کنید.
            </p>
            {activeOrder && (
              <div className="p-3 rounded-lg bg-neutral-100/50 border border-neutral-300/50 mb-4 text-right">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-neutral-500">شناسه سفارش</span>
                  <span className="text-neutral-600 font-num" dir="ltr">{activeOrder.id.slice(0, 8)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-neutral-500">وضعیت</span>
                  <Badge tone="warning" variant="soft">{PAYMENT_STATUS_LABELS[activeOrder.status]}</Badge>
                </div>
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="ghost" fullWidth onClick={handleCancel} loading={cancelOrder.isPending}>
                لغو سفارش
              </Button>
              <Button variant="outline" onClick={handleClose}>بستن</Button>
            </div>
          </div>
        )}

        {paymentState === 'error' && (
          <div className="py-4 text-center">
            <div className="w-14 h-14 rounded-xl bg-error-50 border border-error-500/20 flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-7 h-7 text-error-600" />
            </div>
            <h3 className="text-base font-bold text-neutral-800 mb-2">خطا</h3>
            <p className="text-sm text-error-700 mb-4">{errorMsg}</p>
            <Button variant="primary" fullWidth onClick={() => { setPaymentState('idle'); setErrorMsg(null); }}>تلاش مجدد</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

export function WalletPage() {
  const { data: wallet, isLoading: walletLoading } = useWallet();
  const { data: transactions, isLoading: txLoading } = useWalletTransactions();
  const [showCustomTopUp, setShowCustomTopUp] = useState(false);
  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto animate-fade-in">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm text-neutral-500 hover:text-neutral-600 transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        بازگشت به میدان شهر
      </Link>

      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-accent-50 border border-accent-500/30 flex items-center justify-center">
          <WalletIcon className="w-5 h-5 text-accent-600" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-800">بانک پارسیشو</h1>
          <p className="text-sm text-neutral-500">مدیریت موجودی، پکیج‌ها و تراکنش‌ها</p>
        </div>
      </div>

      <div className="mb-8">
        <PremiumBalanceCard wallet={wallet} isLoading={walletLoading} />
      </div>

      <div className="flex gap-3 mb-8">
        <Button variant="outline" size="sm" onClick={() => setShowCustomTopUp(true)}>
          <ArrowDownToLine className="w-4 h-4" />
          شارژ مبلغ دلخواه
        </Button>
        <Button variant="ghost" size="sm" disabled>
          <ArrowUpFromLine className="w-4 h-4" />
          برداشت
        </Button>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-5">
          <Sparkles className="w-5 h-5 text-primary-600" />
          <h2 className="text-lg font-bold text-neutral-800">پکیج‌های پارسی</h2>
        </div>
        <PackageGrid />
      </div>

      <RecentPaymentOrders />

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-neutral-500" />
            <h2 className="text-lg font-bold text-neutral-800">تاریخچه تراکنش‌ها</h2>
          </div>
          {transactions && transactions.length > 0 && (
            <Badge tone="neutral" variant="soft">
              {toPersianDigits(transactions.length)} تراکنش
            </Badge>
          )}
        </div>

        {txLoading ? (
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
        ) : !transactions || transactions.length === 0 ? (
          <EmptyState
            icon={<Receipt className="w-8 h-8" />}
            title="تراکنشی وجود ندارد"
            description="هنوز تراکنشی در کیف پول شما ثبت نشده است. با خرید پکیج پارسی شروع کنید."
          />
        ) : (
          <div>
            {transactions.map((tx) => (
              <TransactionItem key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </Card>

      <div className="mt-6 flex items-start gap-2 px-4">
        <CheckCircle2 className="w-4 h-4 text-success-600 shrink-0 mt-0.5" />
        <p className="text-xs text-neutral-600">
          تمام تراکنش‌ها به‌صورت امن و رمزنگاری‌شده ثبت می‌شوند. موجودی مسدود
          در مزایده‌های فعال شما، پس از پایان مزایده آزاد می‌شود.
        </p>
      </div>

      <CustomTopUpModal open={showCustomTopUp} onClose={() => setShowCustomTopUp(false)} />
    </div>
  );
}
