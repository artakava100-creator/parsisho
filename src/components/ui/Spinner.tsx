import { cn } from '@/lib/cn';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  label?: string;
}

const sizeMap = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-10 h-10 border-3',
};

export function Spinner({ size = 'md', className, label }: SpinnerProps) {
  return (
    <div className={cn('inline-flex items-center gap-2', className)} role="status" aria-live="polite">
      <span
        className={cn(
          'rounded-full border-primary-300 border-t-primary-600 animate-spin',
          sizeMap[size],
        )}
      />
      {label && <span className="text-sm text-neutral-500">{label}</span>}
      <span className="sr-only">{label || 'در حال بارگذاری'}</span>
    </div>
  );
}

export function FullPageSpinner({ label }: { label?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Spinner size="lg" label={label} />
    </div>
  );
}
