import { Spinner } from '@/components/ui/Spinner';
import { cn } from '@/lib/cn';

interface LoadingStateProps {
  label?: string;
  className?: string;
}

export function LoadingState({ label = 'در حال بارگذاری...', className }: LoadingStateProps) {
  return (
    <div className={cn('flex items-center justify-center py-16', className)}>
      <Spinner size="lg" label={label} />
    </div>
  );
}

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({ message = 'خطا در بارگذاری اطلاعات', onRetry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-16 px-6', className)}>
      <div className="w-12 h-12 rounded-full bg-error-50 flex items-center justify-center mb-3">
        <span className="text-error-600 text-xl">!</span>
      </div>
      <p className="text-sm text-neutral-600">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 text-sm text-primary-700 hover:text-primary-600 font-medium"
        >
          تلاش مجدد
        </button>
      )}
    </div>
  );
}
