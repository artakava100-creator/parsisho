import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowRight, CheckCircle, CreditCard, MapPin, User, ShoppingBag, Truck, AlertCircle } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency, toPersianDigits, normalizePhoneNumber } from '@/lib/persian';
import { useCartStore } from '@/stores/cart-store';
import { useToast } from '@/providers/useToast';
import { useAuth } from '@/providers/useAuth';
import { orderService } from '@/services/order.service';
import { storeSettingsService } from '@/services/store-settings.service';
import { isGatewayConfigured, gatewayNotConfiguredMessage } from '@/lib/payment-gateway';
import { calculateShipping } from '@/lib/shipping';
import { calculatePaymentFee, calculateOrderPrice } from '@/lib/payment-fee';
import type { CreateOrderInput, StoreSettings, ShippingMode, PaymentFeeType } from '@/types';

const provinces = [
  'تهران', 'اصفهان', 'فارس', 'خراسان رضوی', 'آذربایجان شرقی', 'مازندران',
  'گیلان', 'کرمان', 'البرز', 'خوزستان', 'هرمزگان', 'سیستان و بلوچستان',
  'آذربایجان غربی', 'کرمانشاه', 'لرستان', 'همدان', 'مرکزی', 'قم',
  'یزد', 'بوشهر', 'گلستان', 'اردبیل', 'زنجان', 'قزوین', 'سمنان',
  'ایلام', 'چهارمحال و بختیاری', 'کهگیلویه و بویراحمد', 'خراسان شمالی', 'خراسان جنوبی',
];

const checkoutSchema = z.object({
  customerName: z.string().min(3, 'نام و نام خانوادگی را کامل وارد کنید'),
  mobileNumber: z.string().refine((v) => /^09\d{9}$/.test(normalizePhoneNumber(v)), 'شماره موبایل نامعتبر است (۰۹۱۲۳۴۵۶۷۸۹)'),
  province: z.string().min(1, 'استان را انتخاب کنید'),
  city: z.string().min(2, 'نام شهر را وارد کنید'),
  address: z.string().min(10, 'آدرس کامل را وارد کنید'),
  postalCode: z.string().refine((v) => /^\d{10}$/.test(v.replace(/\D/g, '')), 'کد پستی باید ۱۰ رقم باشد'),
  deliveryNote: z.string().optional(),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

const shippingModeLabels: Record<ShippingMode, string> = {
  free: 'ارسال رایگان',
  fixed: 'هزینه ثابت',
  provider: 'محاسبه توسط ارائه‌دهنده',
};

const paymentFeeTypeLabels: Record<PaymentFeeType, string> = {
  none: 'بدون کارمزد',
  percentage: 'درصدی',
  fixed: 'مبلغ ثابت',
  combined: 'ترکیبی',
};

export function CheckoutPage() {
  const { items, totalPrice, clear } = useCartStore();
  const { user } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingNotConfigured, setShippingNotConfigured] = useState(false);
  const [deliveryInfo, setDeliveryInfo] = useState({ province: '', city: '', postalCode: '' });

  const subtotal = totalPrice();
  const discount = 0;
  const gatewayReady = isGatewayConfigured();

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: user?.profile?.displayName ?? user?.displayName ?? '',
      mobileNumber: user?.profile?.phoneNumber ?? '',
      province: user?.profile?.city ?? '',
    },
  });

  const watchedProvince = watch('province');
  const watchedCity = watch('city');
  const watchedPostalCode = watch('postalCode');

  useEffect(() => {
    storeSettingsService.getSettings().then((result) => {
      setSettings(result.data);
    });
  }, []);

  const computeShipping = useCallback(async () => {
    if (!settings) return;
    const result = await calculateShipping({
      settings,
      subtotal,
      province: deliveryInfo.province,
      city: deliveryInfo.city,
      postalCode: deliveryInfo.postalCode,
    });
    setShippingCost(result.cost);
    setShippingNotConfigured(result.notConfigured);
  }, [settings, subtotal, deliveryInfo]);

  useEffect(() => {
    setDeliveryInfo({
      province: watchedProvince ?? '',
      city: watchedCity ?? '',
      postalCode: watchedPostalCode ?? '',
    });
  }, [watchedProvince, watchedCity, watchedPostalCode]);

  useEffect(() => {
    computeShipping();
  }, [computeShipping]);

  const paymentFeeCalc = settings
    ? calculatePaymentFee(settings, subtotal, discount)
    : { fee: 0, type: 'none' as PaymentFeeType, percentage: 0, fixedAmount: 0 };

  const priceCalc = calculateOrderPrice({
    subtotal,
    discount,
    shippingCost,
    paymentFee: paymentFeeCalc.fee,
  });

  if (items.length === 0) {
    return (
      <div className="py-8 px-4 max-w-4xl mx-auto">
        <EmptyState
          icon={<ShoppingBag className="w-8 h-8" />}
          title="سبد خرید شما خالی است"
          description="برای ثبت سفارش ابتدا محصولات را به سبد خرید اضافه کنید"
          action={
            <Link to="/market">
              <Button variant="primary">رفتن به فروشگاه</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const onSubmit = async (data: CheckoutForm) => {
    if (!gatewayReady) {
      toast.warning('درگاه پرداخت', gatewayNotConfiguredMessage);
      return;
    }
    if (shippingNotConfigured) {
      toast.warning('ارسال', 'ارائه‌دهنده ارسال پیکربندی نشده است');
      return;
    }

    setSubmitting(true);
    try {
      const orderInput: CreateOrderInput = {
        customerName: data.customerName,
        mobileNumber: normalizePhoneNumber(data.mobileNumber),
        province: data.province,
        city: data.city,
        address: data.address,
        postalCode: data.postalCode.replace(/\D/g, ''),
        deliveryNote: data.deliveryNote || undefined,
        items: items.map((i) => ({
          productId: i.product.id,
          productName: i.product.name,
          productImage: i.product.imageUrl,
          unitPrice: i.product.price,
          quantity: i.quantity,
          subtotal: i.product.price * i.quantity,
        })),
        subtotal: priceCalc.subtotal,
        discount: priceCalc.discount,
        shippingCost: priceCalc.shippingCost,
        paymentFee: priceCalc.paymentFee,
        total: priceCalc.total,
      };

      const result = await orderService.createOrder(orderInput);
      if (!result.success || !result.order) {
        toast.error('خطا در ثبت سفارش', result.error);
        return;
      }

      clear();
      navigate(`/orders/${result.order.id}/success`);
    } catch {
      toast.error('خطا در ثبت سفارش', 'خطای غیرمنتظره رخ داد');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = gatewayReady && !shippingNotConfigured && settings !== null;

  return (
    <div className="py-4 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto animate-fade-in">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-neutral-500 mb-4">
        <Link to="/market" className="hover:text-neutral-600 transition-colors">فروشگاه</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <Link to="/cart" className="hover:text-neutral-600 transition-colors">سبد خرید</Link>
        <ArrowRight className="w-3.5 h-3.5" />
        <span className="text-neutral-600">ثبت سفارش</span>
      </nav>

      <h1 className="text-xl font-extrabold text-neutral-800 mb-6">ثبت سفارش</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: forms */}
        <div className="lg:col-span-2 space-y-4">
          {/* Customer info */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <User className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-neutral-800">اطلاعات مشتری</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input label="نام و نام خانوادگی" error={errors.customerName?.message} {...register('customerName')} />
              <Input
                label="شماره موبایل"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                error={errors.mobileNumber?.message}
                {...register('mobileNumber')}
              />
            </div>
          </Card>

          {/* Delivery address */}
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <MapPin className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-neutral-800">آدرس تحویل</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-neutral-600 mb-2">استان</label>
                <select
                  {...register('province')}
                  className="w-full h-11 px-4 rounded-lg bg-surface-sunken border border-neutral-300 text-neutral-800 transition-colors duration-normal focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">انتخاب استان</option>
                  {provinces.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {errors.province && <p className="mt-1.5 text-sm text-error-600">{errors.province.message}</p>}
              </div>
              <Input label="شهر" error={errors.city?.message} {...register('city')} />
            </div>
            <div className="mt-4">
              <Input label="آدرس کامل" placeholder="خیابان، کوچه، پلاک، واحد" error={errors.address?.message} {...register('address')} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <Input
                label="کد پستی"
                dir="ltr"
                placeholder="۱۰ رقم"
                error={errors.postalCode?.message}
                {...register('postalCode')}
              />
              <Input
                label="یادداشت تحویل (اختیاری)"
                placeholder="مثلاً: قبل از ارسال تماس بگیرید"
                error={errors.deliveryNote?.message}
                {...register('deliveryNote')}
              />
            </div>
          </Card>
        </div>

        {/* Right: order review */}
        <div className="lg:col-span-1">
          <Card className="p-5 sticky top-20">
            <div className="flex items-center gap-2 mb-4">
              <ShoppingBag className="w-4 h-4 text-primary-600" />
              <h2 className="text-sm font-bold text-neutral-800">خلاصه سفارش</h2>
            </div>

            {/* Items */}
            <div className="space-y-3 mb-4 max-h-48 overflow-y-auto scrollbar-hide">
              {items.map((item) => (
                <div key={item.product.id} className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-neutral-100 shrink-0">
                    <img src={item.product.imageUrl} alt={item.product.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-neutral-800 truncate">{item.product.name}</p>
                    <p className="text-xs text-neutral-500">
                      {toPersianDigits(item.quantity)} × {formatCurrency(item.product.price)}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-primary-700 font-num shrink-0">
                    {formatCurrency(item.product.price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>

            {/* Price breakdown */}
            <div className="space-y-2 py-3 border-t border-neutral-200">
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500">جمع کالا</span>
                <span className="font-num text-neutral-700">{formatCurrency(priceCalc.subtotal)}</span>
              </div>

              {priceCalc.discount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">تخفیف</span>
                  <span className="font-num text-success-700">− {formatCurrency(priceCalc.discount)}</span>
                </div>
              )}

              {/* Shipping */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-neutral-500 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5" />
                  هزینه ارسال
                </span>
                {shippingNotConfigured ? (
                  <span className="text-warning-700 text-xs">پیکربندی نشده</span>
                ) : priceCalc.shippingCost === 0 ? (
                  <span className="text-success-700">رایگان</span>
                ) : (
                  <span className="font-num text-neutral-700">{formatCurrency(priceCalc.shippingCost)}</span>
                )}
              </div>
              {settings && (
                <p className="text-[10px] text-neutral-600 pr-5">
                  روش: {shippingModeLabels[settings.shippingMode]}
                </p>
              )}

              {/* Payment fee */}
              {priceCalc.paymentFee > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-neutral-500">کارمزد پرداخت</span>
                  <span className="font-num text-neutral-700">{formatCurrency(priceCalc.paymentFee)}</span>
                </div>
              )}
              {settings && paymentFeeCalc.type !== 'none' && (
                <p className="text-[10px] text-neutral-600 pr-5">
                  نوع: {paymentFeeTypeLabels[paymentFeeCalc.type]}
                  {paymentFeeCalc.percentage > 0 && ` (${toPersianDigits(paymentFeeCalc.percentage)}٪)`}
                  {paymentFeeCalc.fixedAmount > 0 && ` + ${formatCurrency(paymentFeeCalc.fixedAmount)}`}
                </p>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                <span className="text-base font-bold text-neutral-800">مبلغ قابل پرداخت</span>
                <span className="text-lg font-extrabold text-primary-700 font-num">
                  {formatCurrency(priceCalc.total)}
                </span>
              </div>
            </div>

            {/* Shipping not configured warning */}
            {shippingNotConfigured && (
              <div className="mt-4 p-3 rounded-lg bg-warning-50 border border-warning-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-warning-700/80 leading-relaxed">
                    ارائه‌دهنده ارسال خارجی پیکربندی نشده است. ثبت سفارش پس از پیکربندی ارائه‌دهنده ممکن خواهد بود.
                  </p>
                </div>
              </div>
            )}

            {/* Payment status */}
            {!gatewayReady && (
              <div className="mt-4 p-3 rounded-lg bg-warning-50 border border-warning-500/30">
                <div className="flex items-start gap-2">
                  <CreditCard className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-warning-700/80 leading-relaxed">
                    {gatewayNotConfiguredMessage}. ثبت سفارش پس از فعال‌سازی درگاه پرداخت ممکن خواهد بود.
                  </p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="mt-4 space-y-3">
              <Button type="submit" variant="primary" fullWidth size="lg" loading={submitting} disabled={!canSubmit}>
                <CheckCircle className="w-5 h-5" />
                تأیید و ثبت سفارش
              </Button>
              <Link to="/cart">
                <Button type="button" variant="outline" fullWidth size="lg">
                  <ArrowRight className="w-4 h-4" />
                  بازگشت به سبد
                </Button>
              </Link>
            </div>
          </Card>
        </div>
      </form>
    </div>
  );
}
