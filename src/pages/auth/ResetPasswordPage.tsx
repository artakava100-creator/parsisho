import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { KeyRound, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { useToast } from '@/providers/useToast';
import { authService } from '@/services/auth.service';
import { normalizeError } from '@/services/api-error';
import { passwordSchema } from '@/lib/validation';
import { z } from 'zod';
import { Button } from '@/components/ui/Button';
import { PasswordInput } from '@/components/ui/PasswordInput';

const resetSchema = z.object({
  password: passwordSchema,
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'رمز عبور و تکرار آن یکسان نیستند',
  path: ['confirmPassword'],
});

type ResetForm = z.infer<typeof resetSchema>;

export function ResetPasswordPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [serverError, setServerError] = useState<string | null>(null);
  const [reset, setReset] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  });

  const onSubmit = async (data: ResetForm) => {
    setServerError(null);
    try {
      await authService.updatePassword(data.password);
      setReset(true);
      toast.success('رمز عبور با موفقیت تغییر کرد');
    } catch (err) {
      const normalized = normalizeError(err);
      setServerError(normalized.message);
    }
  };

  // If there's an error in the URL params (e.g. expired token)
  const urlError = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-primary">
              <span className="text-neutral-800 font-extrabold text-2xl">پ</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-neutral-800">رمز عبور جدید</h1>
          <p className="mt-2 text-sm text-neutral-500">
            رمز عبور جدید خود را وارد کنید
          </p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          {urlError && (
            <div
              className="mb-5 p-3.5 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>
                {errorDescription || 'لینک بازنشانی نامعتبر یا منقضی است. لطفاً دوباره درخواست دهید.'}
              </span>
            </div>
          )}

          {serverError && (
            <div
              className="mb-5 p-3.5 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm"
              role="alert"
            >
              {serverError}
            </div>
          )}

          {reset ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success-50 border border-success-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <p className="text-sm text-neutral-600 mb-2">
                رمز عبور شما با موفقیت تغییر کرد.
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                اکنون می‌توانید با رمز عبور جدید وارد شوید.
              </p>
              <Button
                variant="primary"
                onClick={() => navigate('/auth/sign-in', { replace: true })}
              >
                ورود به حساب
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
              <PasswordInput
                label="رمز عبور جدید"
                placeholder="حداقل ۸ کاراکتر"
                autoComplete="new-password"
                hint="رمز عبور باید حداقل ۸ کاراکتر باشد"
                error={errors.password?.message}
                {...register('password')}
              />

              <PasswordInput
                label="تکرار رمز عبور جدید"
                placeholder="رمز عبور را دوباره وارد کنید"
                autoComplete="new-password"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
                {!isSubmitting && <KeyRound className="w-4 h-4" />}
                تغییر رمز عبور
              </Button>
            </form>
          )}
        </div>

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
