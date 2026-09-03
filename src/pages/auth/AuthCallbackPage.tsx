import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { Spinner } from '@/components/ui/Spinner';

type CallbackState = 'loading' | 'success' | 'error';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [cbState, setCbState] = useState<CallbackState>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    (async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          logger.warn('Auth callback: session error', error);
          setCbState('error');
          setErrorMessage('خطا در ورود با Google. لطفاً دوباره تلاش کنید.');
          timeout = setTimeout(() => navigate('/auth/sign-in', { replace: true }), 3000);
          return;
        }
        if (data.session) {
          setCbState('success');
          timeout = setTimeout(() => navigate('/', { replace: true }), 1500);
        } else {
          setCbState('error');
          setErrorMessage('ورود با Google ناموفق بود. لطفاً دوباره تلاش کنید.');
          timeout = setTimeout(() => navigate('/auth/sign-in', { replace: true }), 3000);
        }
      } catch (err) {
        logger.warn('Auth callback: unexpected error', err);
        setCbState('error');
        setErrorMessage('خطای غیرمنتظره. لطفاً دوباره تلاش کنید.');
        timeout = setTimeout(() => navigate('/auth/sign-in', { replace: true }), 3000);
      }
    })();

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [navigate]);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md animate-fade-in-up">
        <div className="glass rounded-2xl p-8 text-center">
          {cbState === 'loading' && (
            <>
              <Spinner size="lg" className="mx-auto mb-4" />
              <h1 className="text-xl font-bold text-neutral-800 mb-2">در حال ورود...</h1>
              <p className="text-sm text-neutral-500">لطفاً صبر کنید</p>
            </>
          )}

          {cbState === 'success' && (
            <>
              <div className="w-16 h-16 rounded-full bg-success-50 border border-success-500/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-success-600" />
              </div>
              <h1 className="text-xl font-bold text-neutral-800 mb-2">ورود موفق</h1>
              <p className="text-sm text-neutral-500">در حال انتقال به میدان شهر...</p>
            </>
          )}

          {cbState === 'error' && (
            <>
              <div className="w-16 h-16 rounded-full bg-error-50 border border-error-200 flex items-center justify-center mx-auto mb-4">
                <XCircle className="w-8 h-8 text-error-600" />
              </div>
              <h1 className="text-xl font-bold text-neutral-800 mb-2">خطا در ورود</h1>
              <p className="text-sm text-error-700 mb-2">{errorMessage}</p>
              <p className="text-xs text-neutral-500">در حال انتقال به صفحه ورود...</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
