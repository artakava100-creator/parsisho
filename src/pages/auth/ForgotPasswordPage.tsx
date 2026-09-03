import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck, ArrowLeft, ArrowRight, Send } from 'lucide-react';
import { useToast } from '@/providers/useToast';
import { authService } from '@/services/auth.service';
import { normalizeError } from '@/services/api-error';
import { z } from 'zod';
import { emailSchema } from '@/lib/validation';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function ForgotPasswordPage() {
  const toast = useToast();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const forgotSchema = z.object({ email: emailSchema });
  type ForgotForm = z.infer<typeof forgotSchema>;

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  });

  const onSubmit = async (data: ForgotForm) => {
    setServerError(null);
    try {
      await authService.resetPassword(data.email);
      setSent(true);
      toast.success('ایمیل بازنشانی ارسال شد');
    } catch (err) {
      const normalized = normalizeError(err);
      setServerError(normalized.message);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 mb-6">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-600 to-primary-800 flex items-center justify-center shadow-glow-primary">
              <span className="text-neutral-800 font-extrabold text-2xl">پ</span>
            </div>
          </Link>
          <h1 className="text-2xl font-extrabold text-neutral-800">بازنشانی رمز عبور</h1>
          <p className="mt-2 text-sm text-neutral-500">
            ایمیل خود را وارد کنید تا لینک بازنشانی برای شما ارسال شود
          </p>
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8">
          {serverError && (
            <div
              className="mb-5 p-3.5 rounded-lg bg-error-50 border border-error-200 text-error-700 text-sm"
              role="alert"
            >
              {serverError}
            </div>
          )}

          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 rounded-full bg-success-50 border border-success-500/30 flex items-center justify-center mx-auto mb-4">
                <MailCheck className="w-8 h-8 text-success-600" />
              </div>
              <p className="text-sm text-neutral-600 mb-2">
                ایمیل بازنشانی رمز عبور ارسال شد.
              </p>
              <p className="text-xs text-neutral-500 mb-6">
                صندوق ورودی خود را بررسی کنید. اگر ایمیل را دریافت نکردید، پوشه اسپم را نیز بررسی کنید.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSent(false)}
              >
                ارسال مجدد
              </Button>
            </div>
          ) : (
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

              <Button type="submit" variant="primary" fullWidth loading={isSubmitting}>
                {!isSubmitting && <Send className="w-4 h-4" />}
                ارسال لینک بازنشانی
              </Button>
            </form>
          )}

          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-px bg-neutral-100" />
            <span className="text-xs text-neutral-600">یا</span>
            <div className="flex-1 h-px bg-neutral-100" />
          </div>

          <p className="text-center text-sm text-neutral-500">
            <Link
              to="/auth/sign-in"
              className="text-primary-700 hover:text-primary-200 font-medium transition-colors inline-flex items-center gap-1"
            >
              بازگشت به ورود
              <ArrowLeft className="w-3.5 h-3.5" />
            </Link>
          </p>
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
