import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Check, Store, Wallet, Image as ImageIcon } from 'lucide-react';
import { useBusinessCategories } from '@/hooks/useBusinesses';
import { useRegisterBusiness } from '@/hooks/useUserBusiness';
import { useWallet } from '@/hooks/useWallet';
import { useSiteSetting } from '@/hooks/useSiteSettings';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { BackButton } from '@/components/ui/BackButton';
import { Spinner } from '@/components/ui/Spinner';
import { toPersianDigits } from '@/lib/persian';
import { cn } from '@/lib/cn';

const STEPS = [
  { key: 'category', label: 'دسته‌بندی' },
  { key: 'info', label: 'اطلاعات' },
  { key: 'contact', label: 'تماس' },
  { key: 'media', label: 'تصاویر' },
  { key: 'payment', label: 'پرداخت' },
] as const;

export function RegisterBusinessPage() {
  const navigate = useNavigate();
  const { data: categories, isLoading: catsLoading } = useBusinessCategories();
  const registerMutation = useRegisterBusiness();
  const { data: wallet } = useWallet();
  const { data: feeSetting } = useSiteSetting<number>('business_registration_fee');
  const registrationFee = feeSetting ?? 1000;
  const balance = wallet?.availableBalance ?? 0;

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    categoryId: '',
    name: '',
    slug: '',
    shortDescription: '',
    description: '',
    city: '',
    locality: '',
    address: '',
    phone: '',
    website: '',
    logoPath: '',
    coverPath: '',
  });
  const [error, setError] = useState<string | null>(null);

  const updateForm = (key: keyof typeof form, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const canProceed = (): boolean => {
    if (step === 0) return !!form.categoryId;
    if (step === 1) return form.name.trim().length > 0 && form.slug.trim().length > 0;
    return true;
  };

  const handleNext = () => {
    setError(null);
    if (!canProceed()) {
      setError('لطفاً تمام فیلدهای الزامی را پر کنید');
      return;
    }
    if (step < STEPS.length - 1) {
      setStep(step + 1);
    }
  };

  const handlePrev = () => {
    setError(null);
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setError(null);

    if (balance < registrationFee) {
      setError(`موجودی کیف پول شما (${toPersianDigits(balance.toLocaleString('fa-IR'))} پارسی) کمتر از هزینه ثبت (${toPersianDigits(registrationFee.toLocaleString('fa-IR'))} پارسی) است. لطفاً ابتدا کیف پول خود را شارژ کنید.`);
      return;
    }

    try {
      const result = await registerMutation.mutateAsync({
        name: form.name,
        slug: form.slug,
        categoryId: form.categoryId,
        shortDescription: form.shortDescription || null,
        description: form.description || null,
        city: form.city || null,
        locality: form.locality || null,
        address: form.address || null,
        phone: form.phone || null,
        website: form.website || null,
        logoPath: form.logoPath || null,
        coverPath: form.coverPath || null,
      });
      navigate('/my-businesses');
      void result;
    } catch (err) {
      setError((err as { message?: string })?.message ?? 'خطا در ثبت کسب‌وکار');
    }
  };

  const slugify = (text: string) =>
    text.trim().toLowerCase().replace(/[^\w\u0600-\u06FF]+/g, '-').replace(/^-+|-+$/g, '');

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8">
        <BackButton label="بازگشت" className="mb-4" />

        <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
          {/* Header */}
          <div className="px-6 py-5 border-b border-neutral-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-neutral-900">ثبت کسب‌وکار جدید</h1>
                <p className="text-sm text-neutral-500">کسب‌وکار خود را در پارسیشو ثبت کنید</p>
              </div>
            </div>
          </div>

          {/* Stepper */}
          <div className="px-6 py-4 bg-neutral-50 border-b border-neutral-100">
            <div className="flex items-center justify-between">
              {STEPS.map((s, i) => (
                <div key={s.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                        i < step
                          ? 'bg-green-500 text-white'
                          : i === step
                            ? 'bg-primary-600 text-white ring-4 ring-primary-100'
                            : 'bg-neutral-200 text-neutral-400',
                      )}
                    >
                      {i < step ? <Check className="w-4 h-4" /> : toPersianDigits(i + 1)}
                    </div>
                    <span
                      className={cn(
                        'text-[10px] font-medium hidden sm:block',
                        i <= step ? 'text-neutral-700' : 'text-neutral-400',
                      )}
                    >
                      {s.label}
                    </span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        'flex-1 h-0.5 mx-1 rounded-full transition-all',
                        i < step ? 'bg-green-500' : 'bg-neutral-200',
                      )}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Step content */}
          <div className="p-6 space-y-4">
            {catsLoading && step === 0 ? (
              <div className="flex justify-center py-8">
                <Spinner className="w-6 h-6 text-primary-600" />
              </div>
            ) : step === 0 ? (
              <>
                <h2 className="text-sm font-bold text-neutral-800 mb-3">دسته‌بندی کسب‌وکار را انتخاب کنید</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {(categories ?? []).map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => updateForm('categoryId', cat.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all',
                        form.categoryId === cat.id
                          ? 'border-primary-500 bg-primary-50'
                          : 'border-neutral-200 hover:border-neutral-300 bg-white',
                      )}
                    >
                      <Store className={cn('w-6 h-6', form.categoryId === cat.id ? 'text-primary-600' : 'text-neutral-400')} />
                      <span className={cn('text-sm font-medium', form.categoryId === cat.id ? 'text-primary-700' : 'text-neutral-600')}>
                        {cat.name}
                      </span>
                    </button>
                  ))}
                </div>
              </>
            ) : step === 1 ? (
              <>
                <h2 className="text-sm font-bold text-neutral-800 mb-3">اطلاعات کسب‌وکار</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">نام کسب‌وکار *</label>
                    <Input
                      value={form.name}
                      onChange={(e) => {
                        updateForm('name', e.target.value);
                        updateForm('slug', slugify(e.target.value));
                      }}
                      placeholder="نام کسب‌وکار شما"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">نامک (slug) *</label>
                    <Input
                      value={form.slug}
                      onChange={(e) => updateForm('slug', slugify(e.target.value))}
                      placeholder="my-business"
                      dir="ltr"
                    />
                    <p className="text-xs text-neutral-400 mt-1">نام انگلیسی برای آدرس صفحه کسب‌وکار</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">توضیح کوتاه</label>
                    <Input
                      value={form.shortDescription}
                      onChange={(e) => updateForm('shortDescription', e.target.value)}
                      placeholder="یک خط توضیح درباره کسب‌وکار"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">توضیحات کامل</label>
                    <textarea
                      value={form.description}
                      onChange={(e) => updateForm('description', e.target.value)}
                      placeholder="توضیحات کامل کسب‌وکار..."
                      rows={4}
                      className="w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                    />
                  </div>
                </div>
              </>
            ) : step === 2 ? (
              <>
                <h2 className="text-sm font-bold text-neutral-800 mb-3">اطلاعات تماس و موقعیت</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">شهر</label>
                    <Input
                      value={form.city}
                      onChange={(e) => updateForm('city', e.target.value)}
                      placeholder="تهران"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">محله</label>
                    <Input
                      value={form.locality}
                      onChange={(e) => updateForm('locality', e.target.value)}
                      placeholder="ولنجک"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">آدرس کامل</label>
                    <Input
                      value={form.address}
                      onChange={(e) => updateForm('address', e.target.value)}
                      placeholder="آدرس دقیق کسب‌وکار"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">تلفن</label>
                    <Input
                      value={form.phone}
                      onChange={(e) => updateForm('phone', e.target.value)}
                      placeholder="۰۲۱-۱۲۳۴۵۶۷۸"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">وب‌سایت</label>
                    <Input
                      value={form.website}
                      onChange={(e) => updateForm('website', e.target.value)}
                      placeholder="https://example.com"
                      dir="ltr"
                    />
                  </div>
                </div>
              </>
            ) : step === 3 ? (
              <>
                <h2 className="text-sm font-bold text-neutral-800 mb-3">تصاویر کسب‌وکار</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">آدرس لوگو</label>
                    <Input
                      value={form.logoPath}
                      onChange={(e) => updateForm('logoPath', e.target.value)}
                      placeholder="https://... logo.png"
                      dir="ltr"
                    />
                    <p className="text-xs text-neutral-400 mt-1">آدرس تصویر لوگوی کسب‌وکار</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-neutral-700 mb-1 block">آدرس کاور</label>
                    <Input
                      value={form.coverPath}
                      onChange={(e) => updateForm('coverPath', e.target.value)}
                      placeholder="https://... cover.jpg"
                      dir="ltr"
                    />
                    <p className="text-xs text-neutral-400 mt-1">تصویر کاور بزرگ صفحه کسب‌وکار</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-xl">
                    <ImageIcon className="w-5 h-5 text-neutral-400" />
                    <p className="text-xs text-neutral-500">می‌توانید بعداً از پنل کسب‌وکار خود تصاویر گالری اضافه کنید.</p>
                  </div>
                </div>
              </>
            ) : step === 4 ? (
              <>
                <h2 className="text-sm font-bold text-neutral-800 mb-3">پرداخت و ثبت نهایی</h2>
                <div className="space-y-4">
                  <div className="bg-primary-50 rounded-xl p-4 border border-primary-100">
                    <div className="flex items-center gap-3 mb-3">
                      <Wallet className="w-6 h-6 text-primary-600" />
                      <div>
                        <p className="text-sm font-bold text-neutral-800">پرداخت از کیف پول پارسی</p>
                        <p className="text-xs text-neutral-500">هزینه ثبت از موجودی کیف پول شما کسر می‌شود</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center py-2 border-t border-primary-100">
                      <span className="text-sm text-neutral-600">هزینه ثبت کسب‌وکار:</span>
                      <span className="text-sm font-bold text-primary-700">{toPersianDigits(registrationFee.toLocaleString('fa-IR'))} پارسی</span>
                    </div>
                    <div className="flex justify-between items-center py-2">
                      <span className="text-sm text-neutral-600">موجودی کیف پول:</span>
                      <span className={cn('text-sm font-bold', balance >= registrationFee ? 'text-green-600' : 'text-red-600')}>
                        {toPersianDigits(balance.toLocaleString('fa-IR'))} پارسی
                      </span>
                    </div>
                    {balance < registrationFee && (
                      <div className="mt-2 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        موجودی کیف پول کافی نیست. لطفاً ابتدا کیف پول خود را شارژ کنید.
                      </div>
                    )}
                  </div>

                  <div className="bg-neutral-50 rounded-xl p-4">
                    <h3 className="text-sm font-medium text-neutral-700 mb-2">خلاصه اطلاعات</h3>
                    <dl className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">نام:</dt>
                        <dd className="text-neutral-800 font-medium">{form.name || '—'}</dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">دسته‌بندی:</dt>
                        <dd className="text-neutral-800 font-medium">
                          {categories?.find((c) => c.id === form.categoryId)?.name ?? '—'}
                        </dd>
                      </div>
                      <div className="flex justify-between">
                        <dt className="text-neutral-500">شهر:</dt>
                        <dd className="text-neutral-800 font-medium">{form.city || '—'}</dd>
                      </div>
                    </dl>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-neutral-400">
                    <Check className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" />
                    <p>کسب‌وکار شما پس از پرداخت با وضعیت «در انتظار تأیید» ثبت می‌شود و پس از بررسی مدیر فعال خواهد شد.</p>
                  </div>
                </div>
              </>
            ) : null}

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>
            )}
          </div>

          {/* Footer navigation */}
          <div className="px-6 py-4 border-t border-neutral-100 flex items-center justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={step === 0}>
              مرحله قبل
            </Button>
            {step < STEPS.length - 1 ? (
              <Button onClick={handleNext} disabled={!canProceed()}>
                مرحله بعد
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                isLoading={registerMutation.isPending}
                disabled={balance < registrationFee}
              >
                پرداخت و ثبت کسب‌وکار
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
