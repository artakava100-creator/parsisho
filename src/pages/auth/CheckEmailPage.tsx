import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailCheck, Send, ArrowRight } from 'lucide-react';
import { useToast } from '@/providers/useToast';
import { authService } from '@/services/auth.service';
import { normalizeError } from '@/services/api-error';
import { Button } from '@/components/ui/Button';

interface CheckEmailPageProps {
  email?: string;
}

export function CheckEmailPage({ email }: CheckEmailPageProps) {
  const toast = useToast();
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.warning('خطا', 'ایمیل در دسترس نیست. لطفاً دوباره ثبت‌نام کنید.');
      return;
    }
    setResending(true);
    try {
      await authService.resendVerification(email);
      toast.success('ایمیل تأیید مجدداً ارسال شد');
    } catch (err) {
      const normalized = normalizeError(err);
      toast.error('خطا در ارسال ایمیل', normalized.message);
    } finally {
      setResending(false);
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
        </div>

        <div className="glass rounded-2xl p-6 sm:p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-primary-50 border border-primary-300 flex items-center justify-center mx-auto mb-5">
            <MailCheck className="w-8 h-8 text-primary-600" />
          </div>

          <h1 className="text-xl font-extrabold text-neutral-800 mb-3">حساب ایجاد شد</h1>

          <p className="text-sm text-neutral-500 mb-2">
            ثبت‌نام شما با موفقیت انجام شد.
          </p>
          <p className="text-sm text-neutral-500 mb-6">
            برای تکمیل ثبت‌نام، لطفاً ایمیل خود را تأیید کنید.
            {email && (
              <>
                <br />
                <span className="text-neutral-600" dir="ltr">{email}</span>
              </>
            )}
          </p>

          <div className="space-y-3">
            {email && (
              <Button
                variant="outline"
                fullWidth
                loading={resending}
                onClick={handleResend}
              >
                {!resending && <Send className="w-4 h-4" />}
                ارسال مجدد ایمیل تأیید
              </Button>
            )}

            <Link to="/auth/sign-in">
              <Button variant="ghost" fullWidth>
                ادامه به ورود
              </Button>
            </Link>
          </div>
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
