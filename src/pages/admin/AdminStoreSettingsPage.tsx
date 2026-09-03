import { useState, useEffect } from 'react';
import { Settings, Save, Truck, CreditCard, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { useToast } from '@/providers/useToast';
import { storeSettingsService } from '@/services/store-settings.service';
import { toPersianDigits, formatCurrency } from '@/lib/persian';
import type { ShippingMode, PaymentFeeType, StoreSettings } from '@/types';

const shippingModes: { value: ShippingMode; label: string; description: string }[] = [
  { value: 'free', label: 'ارسال رایگان', description: 'هزینه ارسال صفر است' },
  { value: 'fixed', label: 'هزینه ثابت', description: 'مبلغ ثابت برای همه سفارش‌ها' },
  { value: 'provider', label: 'ارائه‌دهنده خارجی', description: 'محاسبه توسط ارائه‌دهنده ارسال' },
];

const paymentFeeTypes: { value: PaymentFeeType; label: string }[] = [
  { value: 'none', label: 'بدون کارمزد' },
  { value: 'percentage', label: 'درصدی' },
  { value: 'fixed', label: 'مبلغ ثابت' },
  { value: 'combined', label: 'ترکیبی (درصد + مبلغ ثابت)' },
];

export function AdminStoreSettingsPage() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [lastUpdated, setLastUpdated] = useState('');

  const [shippingMode, setShippingMode] = useState<ShippingMode>('free');
  const [fixedShippingFee, setFixedShippingFee] = useState('0');
  const [shippingProvider, setShippingProvider] = useState('');
  const [paymentFeeType, setPaymentFeeType] = useState<PaymentFeeType>('none');
  const [paymentFeePercentage, setPaymentFeePercentage] = useState('0');
  const [paymentFeeFixedAmount, setPaymentFeeFixedAmount] = useState('0');

  useEffect(() => {
    storeSettingsService.getSettings().then((result) => {
      setSettings(result.data);
      setLastUpdated(result.data.updatedAt);
      setShippingMode(result.data.shippingMode);
      setFixedShippingFee(String(result.data.fixedShippingFee));
      setShippingProvider(result.data.shippingProvider ?? '');
      setPaymentFeeType(result.data.paymentFeeType);
      setPaymentFeePercentage(String(result.data.paymentFeePercentage));
      setPaymentFeeFixedAmount(String(result.data.paymentFeeFixedAmount));
      setLoading(false);
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const result = await storeSettingsService.updateSettings({
        shippingMode,
        fixedShippingFee: parseInt(fixedShippingFee, 10) || 0,
        shippingProvider: shippingMode === 'provider' ? (shippingProvider.trim() || null) : null,
        paymentFeeType,
        paymentFeePercentage: parseFloat(paymentFeePercentage) || 0,
        paymentFeeFixedAmount: parseInt(paymentFeeFixedAmount, 10) || 0,
      });

      if (result.error || !result.data) {
        toast.error('خطا', result.error ?? 'به‌روزرسانی ناموفق بود');
      } else {
        setSettings(result.data);
        setLastUpdated(result.data.updatedAt);
        toast.success('تنظیمات فروشگاه ذخیره شد');
      }
    } catch {
      toast.error('خطا', 'خطای غیرمنتظره رخ داد');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex justify-center">
        <Spinner size="lg" label="در حال بارگذاری تنظیمات..." />
      </div>
    );
  }

  return (
    <div className="py-8 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-xl bg-primary-50 border border-primary-300 flex items-center justify-center">
          <Settings className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-neutral-800">تنظیمات فروشگاه</h1>
          <p className="text-sm text-neutral-500">مدیریت هزینه ارسال و کارمزد پرداخت</p>
          {settings && lastUpdated && (
            <p className="text-xs text-neutral-600 mt-1">آخرین به‌روزرسانی: {toPersianDigits(new Date(lastUpdated).toLocaleDateString('fa-IR'))}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        {/* ─── Shipping ─── */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <Truck className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-bold text-neutral-800">تنظیمات ارسال</h2>
          </div>

          {/* Shipping mode */}
          <div className="space-y-2 mb-5">
            <label className="block text-sm font-medium text-neutral-600">روش محاسبه هزینه ارسال</label>
            {shippingModes.map((mode) => (
              <label
                key={mode.value}
                className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                  shippingMode === mode.value
                    ? 'border-primary-300 bg-primary-500/5'
                    : 'border-neutral-200 hover:border-neutral-300'
                }`}
              >
                <input
                  type="radio"
                  name="shippingMode"
                  value={mode.value}
                  checked={shippingMode === mode.value}
                  onChange={(e) => setShippingMode(e.target.value as ShippingMode)}
                  className="mt-1 accent-primary-500"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold text-neutral-800">{mode.label}</p>
                  <p className="text-xs text-neutral-500 mt-0.5">{mode.description}</p>
                </div>
              </label>
            ))}
          </div>

          {/* Fixed fee (only when mode = fixed) */}
          {shippingMode === 'fixed' && (
            <Input
              label="مبلغ ثابت ارسال (پارسی)"
              type="number"
              inputMode="numeric"
              dir="ltr"
              value={fixedShippingFee}
              onChange={(e) => setFixedShippingFee(e.target.value)}
              hint="این مبلغ برای همه سفارش‌ها اعمال می‌شود"
            />
          )}

          {/* Provider (only when mode = provider) */}
          {shippingMode === 'provider' && (
            <div className="space-y-3">
              <Input
                label="شناسه ارائه‌دهنده ارسال"
                placeholder="مثلاً: post_iran"
                dir="ltr"
                value={shippingProvider}
                onChange={(e) => setShippingProvider(e.target.value)}
                hint="شناسه ارائه‌دهنده خارجی. ارائه‌دهنده باید در سیستم پیکربندی شود."
              />
              <div className="p-3 rounded-lg bg-info-500/10 border border-info-500/30">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-info-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-info-300/80 leading-relaxed">
                    ارائه‌دهنده ارسال خارجی باید از طریق رابط برنامه‌نویسی پیکربندی شود.
                    تا زمان پیکربندی، ثبت سفارش غیرفعال خواهد بود.
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* ─── Payment fee ─── */}
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-5">
            <CreditCard className="w-4 h-4 text-primary-600" />
            <h2 className="text-sm font-bold text-neutral-800">کارمزد پرداخت / بانکی</h2>
          </div>

          {/* Fee type */}
          <div className="space-y-2 mb-5">
            <label className="block text-sm font-medium text-neutral-600">نوع کارمزد</label>
            <div className="grid grid-cols-2 gap-2">
              {paymentFeeTypes.map((ft) => (
                <label
                  key={ft.value}
                  className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                    paymentFeeType === ft.value
                      ? 'border-primary-300 bg-primary-500/5'
                      : 'border-neutral-200 hover:border-neutral-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="paymentFeeType"
                    value={ft.value}
                    checked={paymentFeeType === ft.value}
                    onChange={(e) => setPaymentFeeType(e.target.value as PaymentFeeType)}
                    className="accent-primary-500"
                  />
                  <span className="text-sm text-neutral-700">{ft.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Percentage (when percentage or combined) */}
          {(paymentFeeType === 'percentage' || paymentFeeType === 'combined') && (
            <Input
              label="درصد کارمزد"
              type="number"
              inputMode="decimal"
              step="0.01"
              dir="ltr"
              value={paymentFeePercentage}
              onChange={(e) => setPaymentFeePercentage(e.target.value)}
              hint="درصد از مبلغ کالا (پس از کسر تخفیف)"
            />
          )}

          {/* Fixed amount (when fixed or combined) */}
          {(paymentFeeType === 'fixed' || paymentFeeType === 'combined') && (
            <div className={paymentFeeType === 'combined' ? 'mt-4' : ''}>
              <Input
                label="مبلغ ثابت کارمزد (پارسی)"
                type="number"
                inputMode="numeric"
                dir="ltr"
                value={paymentFeeFixedAmount}
                onChange={(e) => setPaymentFeeFixedAmount(e.target.value)}
              />
            </div>
          )}
        </Card>

        {/* ─── Summary preview ─── */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-4 h-4 text-success-600" />
            <h2 className="text-sm font-bold text-neutral-800">پیش‌نمایش</h2>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">روش ارسال</span>
              <Badge tone="neutral" variant="soft">
                {shippingModes.find((m) => m.value === shippingMode)?.label}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-neutral-500">کارمزد پرداخت</span>
              <Badge tone="neutral" variant="soft">
                {paymentFeeTypes.find((ft) => ft.value === paymentFeeType)?.label}
              </Badge>
            </div>
            {shippingMode === 'fixed' && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">هزینه ارسال ثابت</span>
                <span className="font-num text-neutral-700">{formatCurrency(parseInt(fixedShippingFee, 10) || 0)}</span>
              </div>
            )}
            {(paymentFeeType === 'percentage' || paymentFeeType === 'combined') && paymentFeePercentage !== '0' && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-500">درصد کارمزد</span>
                <span className="font-num text-neutral-700">{toPersianDigits(parseFloat(paymentFeePercentage) || 0)}٪</span>
              </div>
            )}
          </div>
        </Card>

        {/* ─── Save ─── */}
        <div className="flex gap-3">
          <Button type="submit" variant="primary" size="lg" loading={saving}>
            <Save className="w-4 h-4" />
            ذخیره تنظیمات
          </Button>
        </div>
      </form>
    </div>
  );
}
