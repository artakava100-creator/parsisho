import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Mail, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

type VerifyState = 'loading' | 'success' | 'error' | 'already-verified';

export function VerifyEmailPage() {
  const [verifyState, setVerifyState] = useState<VerifyState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const hash = window.location.hash;
    const params = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    const type = params.get('type');
    const error = params.get('error');
    const errorDescription = params.get('error_description');

    if (error) {
      setVerifyState('error');
      setErrorMessage(errorDescription || 'لینک تأیید نامعتبر یا منقضی است.');
      return;
    }

    if (type === 'signup' || type === 'email') {
      (async () => {
        try {
          const { data, error } = await supabase.auth.getSession();
          if (error) {
            logger.warn('Verify email: session error', error);
            setVerifyState('error');
            setErrorMessage('خطا در تأیید ایمیل. لطفاً دوباره تلاش کنید.');
            return;
          }
          if (data.session?.user?.email_confirmed_at) {
            setVerifyState('success');
          } else if (data.session) {
            setVerifyState('already-verified');
          } else {
            setVerifyState('success');
          }
        } catch (err) {
          logger.warn('Verify email: unexpected error', err);
          setVerifyState('error');
          setErrorMessage('خطا در تأیید ایمیل. لطفاً دوباره تلاش کنید.');
        }
      })();
    } else {
      setVerifyState('success');
    }
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass rounded-2xl p-8 text-center">
          {verifyState === 'loading' && (
            <>
              <Spinner size="lg" className="mx-auto mb-4" />
              <h1 className="text-xl font-bold text-neutral-800 mb-2">در حال تأیید ایمیل...</h1>
              <p className="text-sm text-neutral-500">لطفاً صبر کنید</p>
            </>
          )}

          {verifyState === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-success-50 border border-success-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <h1 className="text-xl font-bold text-neutral-800 mb-2">ایمیل تأیید شد</h1>
              <p className="text-sm text-neutral-500 mb-6">
                ایمیل شما با موفقیت تأیید شد. اکنون می‌توانید وارد شوید.
              </p>
              <Link to="/auth/sign-in">
                <Button variant="primary" fullWidth>
                  ورود به حساب
                </Button>
              </Link>
            </>
          )}

          {verifyState === 'already-verified' && (
            <>
              <div className="w-16 h-16 rounded-full bg-info-500/10 border border-info-500/30 flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-info-400" />
              </div>
              <h1 className="text-xl font-bold text-neutral-800 mb-2">ایمیل قبلاً تأیید شده</h1>
              <p className="text-sm text-neutral-500 mb-6">
                ایمیل شما قبلاً تأیید شده است. نیازی به تأیید مجدد نیست.
              </p>
              <Link to="/">
                <Button variant="primary" fullWidth>
                  بازگشت به میدان شهر
                </Button>
              </Link>
            </>
          )}

          {verifyState === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-error-50 border border-error-200 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-error-600" />
              </div>
              <h1 className="text-xl font-bold text-neutral-800 mb-2">خطا در تأیید ایمیل</h1>
              <p className="text-sm text-error-700 mb-6">{errorMessage}</p>
              <Link to="/auth/sign-in">
                <Button variant="outline" fullWidth>
                  بازگشت به ورود
                </Button>
              </Link>
            </>
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
