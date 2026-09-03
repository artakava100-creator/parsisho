import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Wallet as WalletIcon,
  ArrowLeft,
  ArrowDownToLine,
  CheckCircle2,
  AlertCircle,
  XCircle,
  CreditCard,
  Sparkles,
  Lock,
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
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Modal } from '@/components/ui/Modal';
import { ParsishoBankCard } from '@/components/wallet/ParsishoBankCard';
import { ParsiPackageCard } from '@/components/wallet/ParsiPackageCard';
import { PaidOrdersAccordion } from '@/components/wallet/PaidOrdersAccordion';
import { TransactionHistoryAccordion } from '@/components/wallet/TransactionHistoryAccordion';
import { CustomTopUpCTA } from '@/components/wallet/CustomTopUpCTA';
import { AdSlot } from '@/components/ads/AdSlot';
import type { ParsiPackage, PaymentOrder, PaymentOrderStatus } from '@/types';

const PAYMENT_STATUS_LABELS: Record<PaymentOrderStatus, string> = {
  pending: 'در انتظار پرداخت',
  success: 'پرداخت موفق',
  failed: 'پرداخت ناموفق',
  cancelled: 'لغو شده',
};

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
          <Card key={i} className="p-5" glass={false}>
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
      <Card className="p-8" glass={false}>
        <EmptyState
          icon={<WalletIcon className="w-8 h-8" />}
          title="بسته‌ای موجود نیست"
          description="در حال حاضر بسته شارژی موجود نیست. بعداً تلاش کنید."
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {packages.map((pkg) => (
          <ParsiPackageCard
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
              <h3 className="text-lg font-bold text-neutral-800 mb-2">تأیید خرید بسته</h3>
              <p className="text-sm text-neutral-500 mb-1">
                خرید <span className="font-bold text-primary-700">{formatCurrency(confirmPkg?.parsiAmount ?? 0)}</span>
              </p>
              {confirmPkg && confirmPkg.bonusAmount > 0 && (
                <p className="text-sm text-success-600 mb-1">
                  به‌علاوه {formatNumber(confirmPkg.bonusAmount)} پارسی بونوس
                </p>
              )}
              <p className="text-sm text-neutral-500 mb-1">
                مبلغ پرداختی: {formatNumber(confirmPkg?.price ?? 0)} تومان
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
      setError(`حداقل مبلغ شارژ ${toPersianDigits(CUSTOM_MIN_AMOUNT.toLocaleString('en-US'))} تومان است`);
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
              label="مبلغ شارژ (تومان)"
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
              hint={`حداقل مبلغ: ${toPersianDigits(CUSTOM_MIN_AMOUNT.toLocaleString('en-US'))} تومان`}
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
  const { data: transactions, isLoading: txLoading, isError: txError } = useWalletTransactions();
  const { data: orders, isLoading: ordersLoading, isError: ordersError } = usePaymentOrders();
  const [showCustomTopUp, setShowCustomTopUp] = useState(false);

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto animate-fade-in">
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
          <p className="text-sm text-neutral-500">مدیریت موجودی، بسته‌ها و تراکنش‌ها</p>
        </div>
      </div>

      {/* Desktop layout: ad rail + main content */}
      <div className="flex gap-6">
        {/* Left advertising rail — desktop only */}
        <aside className="hidden lg:flex flex-col gap-4 w-56 shrink-0">
          <div className="sticky top-20 flex flex-col gap-4">
            <AdSlot slotKey="wallet_sidebar_left_top" device="desktop" />
            <AdSlot slotKey="wallet_sidebar_left_bottom" device="desktop" />
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0 space-y-8">
          {/* Bank card */}
          <ParsishoBankCard wallet={wallet} isLoading={walletLoading} />

          {/* Custom top-up CTA */}
          <CustomTopUpCTA onCustomTopUp={() => setShowCustomTopUp(true)} />

          {/* Parsi Packages */}
          <div>
            <div className="flex items-center gap-2 mb-5">
              <Sparkles className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-neutral-800">بسته‌های پارسی</h2>
            </div>
            <PackageGrid />
          </div>

          {/* Paid Orders */}
          <PaidOrdersAccordion orders={orders} isLoading={ordersLoading} isError={ordersError} />

          {/* Transaction History */}
          <TransactionHistoryAccordion transactions={transactions} isLoading={txLoading} isError={txError} />

          {/* Security note */}
          <div className="flex items-start gap-2 px-4">
            <Lock className="w-4 h-4 text-success-600 shrink-0 mt-0.5" />
            <p className="text-xs text-neutral-600">
              تمام تراکنش‌ها به‌صورت امن و رمزنگاری‌شده ثبت می‌شوند. موجودی مسدود
              در مزایده‌های فعال شما، پس از پایان مزایده آزاد می‌شود.
            </p>
          </div>
        </div>
      </div>

      <CustomTopUpModal open={showCustomTopUp} onClose={() => setShowCustomTopUp(false)} />
    </div>
  );
}
