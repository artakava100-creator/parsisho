import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Mail,
  Phone,
  MapPin,
  Shield,
  Star,
  CheckCircle2,
  XCircle,
  Save,
  ArrowLeft,
  Send,
  AlertCircle,
  ShieldCheck,
  Lock,
  UserCheck,
  Gavel,
  Trophy,
  ShoppingBag,
  MousePointerClick,
} from 'lucide-react';
import { useAuth } from '@/providers/useAuth';
import { useToast } from '@/providers/useToast';
import { useUserAuctionHistory } from '@/hooks/useAuction';
import { profileService } from '@/services/profile.service';
import { normalizeError } from '@/services/api-error';
import { profileUpdateSchema, type ProfileUpdateForm } from '@/lib/validation';
import { toPersianDigits, maskPhoneNumber, normalizePhoneNumber, formatCurrency } from '@/lib/persian';
import { formatJalaliShort } from '@/lib/jalali';
import { getIdentityState, getAccountStatusLabel } from '@/lib/eligibility';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { Link } from 'react-router-dom';
import type { AuctionHistoryEntry } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  user: 'کاربر',
  seller: 'فروشنده',
  admin: 'مدیر',
  super_admin: 'مدیر ارشد',
};

type PhoneStep = 'display' | 'enter' | 'verify';

export function AccountPage() {
  const { user, reloadProfile, resendEmailVerification } = useAuth();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [phoneStep, setPhoneStep] = useState<PhoneStep>('display');
  const [resending, setResending] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [phoneVerifying, setPhoneVerifying] = useState(false);
  const [phoneInput, setPhoneInput] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ProfileUpdateForm>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: {
      displayName: user?.profile?.displayName ?? user?.displayName ?? '',
      city: user?.profile?.city ?? null,
      phoneNumber: user?.profile?.phoneNumber ?? null,
    },
  });

  if (!user) return null;

  const profile = user.profile;
  const identity = getIdentityState(user);
  const isEmailVerified = user.emailVerified;
  const isPhoneVerified = Boolean(profile?.phoneVerifiedAt);
  const hasPhone = Boolean(profile?.phoneNumber);
  const accountStatus = profile?.accountStatus ?? 'active';

  const handleResendVerification = async () => {
    setResending(true);
    try {
      await resendEmailVerification(user.email);
      toast.success('ایمیل تأیید مجدداً ارسال شد');
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error('خطا در ارسال ایمیل', normalized.message);
    } finally {
      setResending(false);
    }
  };

  const onSubmit = async (data: ProfileUpdateForm) => {
    try {
      const normalizedPhone = data.phoneNumber ? normalizePhoneNumber(data.phoneNumber) : null;
      await profileService.update(user.id, {
        display_name: data.displayName,
        city: data.city || null,
        phone_number: normalizedPhone,
      });
      await reloadProfile();
      toast.success('پروفایل به‌روزرسانی شد');
      setEditing(false);
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error('خطا در به‌روزرسانی', normalized.message);
    }
  };

  const handleCancel = () => {
    reset({
      displayName: profile?.displayName ?? user.displayName,
      city: profile?.city ?? null,
      phoneNumber: profile?.phoneNumber ?? null,
    });
    setEditing(false);
  };

  const handlePhoneSave = async () => {
    if (!phoneInput) {
      toast.error('خطا', 'شماره موبایل را وارد کنید');
      return;
    }
    const normalized = normalizePhoneNumber(phoneInput);
    if (!/^09\d{9}$/.test(normalized)) {
      toast.error('خطا', 'شماره موبایل نامعتبر است');
      return;
    }
    try {
      await profileService.update(user.id, { phone_number: normalized });
      await reloadProfile();
      setPhoneStep('verify');
      toast.info(
        'کد تأیید',
        'برای تأیید شماره موبایل، سیستم پیامک باید فعال شود. در حال حاضر تأیید شماره ممکن نیست.',
      );
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error('خطا', normalized.message);
    }
  };

  const handlePhoneVerify = async () => {
    setPhoneVerifying(true);
    try {
      toast.info(
        'تأیید شماره موبایل',
        'سرویس پیامک فعلاً فعال نیست. تأیید شماره موبایل پس از پیکربندی سرویس پیامک فعال خواهد شد.',
      );
    } finally {
      setPhoneVerifying(false);
      setPhoneStep('display');
    }
  };

  const steps = [
    { label: 'ثبت‌نام', done: identity.isRegistered },
    { label: 'تأیید ایمیل', done: identity.isEmailVerified },
    { label: 'ثبت موبایل', done: identity.hasPhoneNumber },
    { label: 'تأیید موبایل', done: identity.isPhoneVerified },
    { label: 'احراز هویت', done: identity.isIdentityVerified },
    { label: 'اجازه کلیک در مزایده', done: identity.isAuctionEligible, locked: !identity.isAuctionEligible },
  ];

  return (
    <div className="min-h-[calc(100vh-4rem)] py-4 sm:py-8 px-3 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs sm:text-sm text-neutral-500 hover:text-neutral-600 transition-colors mb-4 sm:mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          بازگشت به میدان شهر
        </Link>

        {/* Identity progress */}
        <Card className="p-4 sm:p-6 sm:p-8 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-neutral-800 mb-3 sm:mb-5">مراحل تکمیل هویت</h2>
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={idx} className="flex items-center gap-3">
                <div className="flex items-center justify-center w-7 h-7 rounded-full shrink-0">
                  {step.done ? (
                    <CheckCircle2 className="w-5 h-5 text-success-600" />
                  ) : step.locked ? (
                    <Lock className="w-4 h-4 text-neutral-600" />
                  ) : (
                    <div className="w-5 h-5 rounded-full border-2 border-neutral-300" />
                  )}
                </div>
                <span
                  className={`text-sm ${step.done ? 'text-neutral-700' : step.locked ? 'text-neutral-600' : 'text-neutral-500'}`}
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          {!identity.isAuctionEligible && (
            <div className="mt-5 p-3 rounded-lg bg-warning-50 border border-warning-500/30 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning-600 shrink-0 mt-0.5" />
              <p className="text-xs text-warning-700/80">
                {identity.eligibilityReasons.length > 0
                  ? `برای کلیک در مزایده ابتدا باید: ${identity.eligibilityReasons.join('، ')}`
                  : 'برای کلیک در مزایده باید هویت خود را تکمیل کنید.'}
              </p>
            </div>
          )}
        </Card>

        {/* Header card */}
        <Card className="p-4 sm:p-6 sm:p-8 mb-4 sm:mb-6">
          <div className="flex items-start gap-3 sm:gap-5">
            <Avatar src={user.avatarUrl ?? undefined} name={user.displayName} size="xl" ring />
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-xl font-extrabold text-neutral-800 truncate">{user.displayName}</h1>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <Badge tone="primary" variant="soft">
                  <Shield className="w-3 h-3" />
                  {ROLE_LABELS[user.role] ?? user.role}
                </Badge>
                {profile && (
                  <Badge tone="accent" variant="soft">
                    <Star className="w-3 h-3" />
                    اعتبار: {toPersianDigits(profile.reputationScore)}
                  </Badge>
                )}
                <Badge
                  tone={accountStatus === 'active' ? 'success' : 'error'}
                  variant="soft"
                >
                  <ShieldCheck className="w-3 h-3" />
                  {getAccountStatusLabel(accountStatus)}
                </Badge>
              </div>
            </div>
            {!editing && (
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                ویرایش
              </Button>
            )}
          </div>
        </Card>

        {/* Identity section */}
        <Card className="p-4 sm:p-6 sm:p-8 mb-4 sm:mb-6">
          <h2 className="text-base sm:text-lg font-bold text-neutral-800 mb-3 sm:mb-5">اطلاعات حساب</h2>

          {editing ? (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input label="نام نمایشی" error={errors.displayName?.message} {...register('displayName')} />
              <Input label="شهر" placeholder="مثلاً: تهران" error={errors.city?.message} {...register('city')} />
              <Input
                label="شماره موبایل"
                placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                dir="ltr"
                hint="شماره موبایل باید با ۰۹ شروع شود. تأیید شماره بعداً فعال خواهد شد."
                error={errors.phoneNumber?.message}
                {...register('phoneNumber')}
              />
              <div className="flex gap-3 pt-2">
                <Button type="submit" variant="primary" loading={isSubmitting}>
                  {!isSubmitting && <Save className="w-4 h-4" />}
                  ذخیره تغییرات
                </Button>
                <Button type="button" variant="ghost" onClick={handleCancel}>
                  انصراف
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
              {/* Email */}
              <div className="flex items-center gap-3 py-3 border-b border-neutral-200">
                <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-neutral-500">ایمیل</p>
                    {isEmailVerified ? (
                      <Badge tone="success" variant="soft">
                        <CheckCircle2 className="w-3 h-3" />
                        تأیید شده
                      </Badge>
                    ) : (
                      <Badge tone="warning" variant="soft">
                        <XCircle className="w-3 h-3" />
                        تأیید نشده
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 truncate mt-0.5" dir="ltr">
                    {user.email}
                  </p>
                  {!isEmailVerified && (
                    <button
                      onClick={handleResendVerification}
                      disabled={resending}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-700 hover:text-primary-200 transition-colors disabled:opacity-50"
                    >
                      <Send className="w-3 h-3" />
                      {resending ? 'در حال ارسال...' : 'ارسال مجدد ایمیل تأیید'}
                    </button>
                  )}
                </div>
              </div>

              {/* Phone */}
              <div className="flex items-center gap-3 py-3 border-b border-neutral-200">
                <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-neutral-500">شماره موبایل</p>
                    {!hasPhone ? (
                      <Badge tone="neutral" variant="soft">
                        <XCircle className="w-3 h-3" />
                        ثبت نشده
                      </Badge>
                    ) : isPhoneVerified ? (
                      <Badge tone="success" variant="soft">
                        <CheckCircle2 className="w-3 h-3" />
                        تأیید شده
                      </Badge>
                    ) : (
                      <Badge tone="warning" variant="soft">
                        <XCircle className="w-3 h-3" />
                        تأیید نشده
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 mt-0.5" dir="ltr">
                    {hasPhone && profile?.phoneNumber ? maskPhoneNumber(profile.phoneNumber) : '—'}
                  </p>

                  {phoneStep === 'display' && !isPhoneVerified && (
                    <button
                      onClick={() => {
                        setPhoneInput(profile?.phoneNumber ?? '');
                        setPhoneStep('enter');
                      }}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-700 hover:text-primary-200 transition-colors"
                    >
                      {hasPhone ? 'تأیید شماره موبایل' : 'ثبت شماره موبایل'}
                    </button>
                  )}

                  {phoneStep === 'enter' && (
                    <div className="mt-3 space-y-3">
                      <Input
                        label="شماره موبایل"
                        placeholder="۰۹۱۲۳۴۵۶۷۸۹"
                        dir="ltr"
                        value={phoneInput}
                        onChange={(e) => setPhoneInput(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" onClick={handlePhoneSave}>
                          <Send className="w-3.5 h-3.5" />
                          ارسال کد تأیید
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPhoneStep('display')}>
                          انصراف
                        </Button>
                      </div>
                    </div>
                  )}

                  {phoneStep === 'verify' && (
                    <div className="mt-3 space-y-3">
                      <div className="p-3 rounded-lg bg-info-500/10 border border-info-500/30">
                        <p className="text-xs text-info-300">
                          کد تأیید به شماره{' '}
                          {hasPhone && profile?.phoneNumber ? maskPhoneNumber(profile.phoneNumber) : ''}{' '}
                          ارسال شد. برای تأیید نهایی، کد را وارد کنید.
                        </p>
                      </div>
                      <Input
                        label="کد تأیید"
                        placeholder="کد ۶ رقمی"
                        dir="ltr"
                        value={otpCode}
                        onChange={(e) => setOtpCode(e.target.value)}
                        maxLength={6}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="primary" onClick={handlePhoneVerify} loading={phoneVerifying}>
                          تأیید شماره
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setPhoneStep('display')}>
                          انصراف
                        </Button>
                      </div>
                      <p className="text-xs text-neutral-600">
                        توجه: سرویس پیامک فعلاً فعال نیست. تأیید شماره موبایل پس از پیکربندی سرویس پیامک فعال خواهد شد.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* City */}
              <div className="flex items-center gap-3 py-3 border-b border-neutral-200">
                <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-500">شهر</p>
                  <p className="text-sm text-neutral-700">{profile?.city || '—'}</p>
                </div>
              </div>

              {/* Identity verification */}
              <div className="flex items-center gap-3 py-3 border-b border-neutral-200">
                <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <UserCheck className="w-5 h-5 text-neutral-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm text-neutral-500">احراز هویت</p>
                    {identity.isIdentityVerified ? (
                      <Badge tone="success" variant="soft">
                        <CheckCircle2 className="w-3 h-3" />
                        تأیید شده
                      </Badge>
                    ) : (
                      <Badge tone="neutral" variant="soft">
                        <XCircle className="w-3 h-3" />
                        انجام نشده
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-neutral-700 mt-0.5">
                    احراز هویت در آینده فعال خواهد شد
                  </p>
                </div>
              </div>

              {/* Reputation */}
              <div className="flex items-center gap-3 py-3">
                <div className="w-10 h-10 rounded-lg bg-surface-overlay flex items-center justify-center shrink-0">
                  <Star className="w-5 h-5 text-accent-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-neutral-500">امتیاز اعتبار</p>
                  <p className="text-sm text-neutral-700">
                    {profile ? toPersianDigits(profile.reputationScore) : '—'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </Card>

        {/* Auction History */}
        <AuctionHistorySection />

        {/* Store Orders */}
        <Card className="p-4 sm:p-6 sm:p-8 mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-3 sm:mb-5">
            <h2 className="text-base sm:text-lg font-bold text-neutral-800">سفارش‌های فروشگاه</h2>
            <Link to="/orders" className="text-xs sm:text-sm text-primary-700 hover:text-primary-200 transition-colors">
              مشاهده همه
            </Link>
          </div>
          <p className="text-xs sm:text-sm text-neutral-500">
            برای مشاهده و پیگیری سفارش‌های فروشگاه به صفحه سفارش‌ها مراجعه کنید.
          </p>
        </Card>

        <p className="text-xs text-neutral-600 text-center px-4">
          ایمیل و رمز عبور توسط سیستم احراز هویت مدیریت می‌شوند. نقش کاربری، امتیاز
          اعتبار، وضعیت تأیید موبایل، احراز هویت و وضعیت حساب توسط سیستم کنترل می‌شوند
          و قابل تغییر توسط کاربر نیستند.
        </p>
      </div>
    </div>
  );
}

function getResultLabel(entry: AuctionHistoryEntry): { label: string; tone: 'success' | 'warning' | 'error' | 'neutral' } {
  if (entry.isWinner) return { label: 'برنده شدید', tone: 'success' };
  if (entry.status === 'cancelled') return { label: 'مزایده لغو شد', tone: 'error' };
  if (entry.status === 'live' || entry.status === 'ending') return { label: 'در حال برگزاری', tone: 'warning' };
  return { label: 'برنده نشدید', tone: 'neutral' };
}

function AuctionHistorySection() {
  const { data, isLoading } = useUserAuctionHistory();
  const history = data || [];

  if (isLoading) {
    return (
      <Card className="p-4 sm:p-6 sm:p-8 mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-neutral-800 mb-3 sm:mb-5">مزایده‌های شرکت‌کرده</h2>
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card className="p-4 sm:p-6 sm:p-8 mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-neutral-800 mb-3 sm:mb-5">مزایده‌های شرکت‌کرده</h2>
        <EmptyState
          icon={<Gavel className="w-8 h-8" />}
          title="هنوز در مزایده‌ای شرکت نکرده‌اید"
          description="با کلیک در مزایده‌های زنده شرکت کنید و شانس برنده‌شدن داشته باشید."
        />
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6 sm:p-8 mb-4 sm:mb-6">
      <h2 className="text-base sm:text-lg font-bold text-neutral-800 mb-3 sm:mb-5">مزایده‌های شرکت‌کرده</h2>
      <div className="space-y-3">
        {history.map((entry) => {
          const result = getResultLabel(entry);
          return (
            <Link
              key={entry.auctionId}
              to={`/auctions/${entry.auctionId}`}
              className="block group"
            >
              <div className="flex items-center gap-3 p-3 rounded-lg bg-neutral-100/30 border border-neutral-200 hover:border-neutral-300 transition-colors">
                {/* Image */}
                <div className="w-12 h-12 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                  {entry.imageUrl ? (
                    <img src={entry.imageUrl} alt={entry.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Gavel className="w-5 h-5 text-neutral-700" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-neutral-800 truncate group-hover:text-primary-700 transition-colors">
                    {entry.productName || entry.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-xs text-neutral-500">
                    <span className="flex items-center gap-1">
                      <MousePointerClick className="w-3 h-3" />
                      {toPersianDigits(entry.userClickCount)} کلیک
                    </span>
                    <span>{formatCurrency(entry.userTotalSpent)}</span>
                    <span>{formatJalaliShort(new Date(entry.endsAt))}</span>
                  </div>
                </div>

                {/* Result badge */}
                <div className="shrink-0 text-left">
                  <Badge tone={result.tone} variant="soft">
                    {entry.isWinner && <Trophy className="w-3 h-3" />}
                    {result.label}
                  </Badge>
                  {entry.status === 'ended' && !entry.isWinner && entry.originalPrice && entry.originalPrice > 0 && (
                    <div className="flex items-center gap-1 mt-1 text-[10px] text-primary-600">
                      <ShoppingBag className="w-2.5 h-2.5" />
                      خرید مستقیم
                    </div>
                  )}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </Card>
  );
}
