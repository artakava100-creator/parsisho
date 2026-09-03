import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gavel, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuth } from '@/providers/useAuth';
import { useToast } from '@/providers/useToast';
import { signInSchema, type SignInForm } from '@/lib/validation';
import { normalizeError } from '@/services/api-error';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { GoogleButton } from '@/components/ui/GoogleButton';

export function SignInPage() {
  const { signIn, signInWithGoogle } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [serverError, setServerError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);

  const from = (location.state as { from?: string })?.from || '/';

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignInForm>({
    resolver: zodResolver(signInSchema),
  });

  const onSubmit = async (data: SignInForm) => {
    setServerError(null);
    try {
      await signIn(data.email, data.password);
      toast.success('با موفقیت وارد شدید');
      navigate(from, { replace: true });
    } catch (err) {
      const normalized = normalizeError(err);
      setServerError(normalized.message);
    }
  };

  const handleGoogle = async () => {
    setServerError(null);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setGoogleLoading(false);
      const normalized = normalizeError(err);
      setServerError(normalized.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-primary">
              <span className="text-neutral-800 font-extrabold text-2xl">پ</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-neutral-800">ورود به پارسیشو</h1>
          <p className="mt-2 text-sm text-neutral-500">
            به شهر دیجیتال پارسی خوش آمدید
          </p>
        </div>

        {/* Form card */}
        <div className="glass rounded-2xl p-6 sm:p-8">
          {serverError && (
            <div
              className="mb-5 p-3.5 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
            <Input
              label="ایمیل"
              type="email"
              placeholder="example@email.com"
              autoComplete="email"
              dir="ltr"
              error={errors.email?.message}
              {...register('email')}
            />

            <PasswordInput
              label="رمز عبور"
              placeholder="حداقل ۸ کاراکتر"
              autoComplete="current-password"
              error={errors.password?.message}
              {...register('password')}
            />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-neutral-500 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-neutral-300 bg-surface-sunken text-primary-500 focus:ring-primary-500"
                />
                مرا به خاطر بسپار
              </label>
              <Link
                to="/auth/forgot-password"
                className="text-sm text-primary-700 hover:text-primary-200 transition-colors"
              >
                رمز عبور را فراموش کرده‌اید؟
              </Link>
            </div>

            <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
              {!isSubmitting && <Gavel className="w-4 h-4" />}
              ورود
            </Button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-xs text-neutral-600">یا</span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          {/* Google login */}
          <GoogleButton onClick={handleGoogle} loading={googleLoading} />

          {/* Sign up link */}
          <p className="text-center text-sm text-neutral-500">
            حساب کاربری ندارید؟{' '}
            <Link
              to="/auth/sign-up"
              className="text-primary-700 hover:text-primary-200 font-medium transition-colors inline-flex items-center gap-1"
            >
              ثبت‌نام کنید
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>

        {/* Back to home */}
        <div className="mt-6 text-center">
          <Link
            to="/"
            className="text-sm text-neutral-500 hover:text-neutral-600 transition-colors inline-flex items-center gap-1"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            بازگشت به میدان شهر
          </Link>
        </div>
      </div>
    </div>
  );
}
