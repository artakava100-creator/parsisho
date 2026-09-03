import { forwardRef, type InputHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-neutral-700 mb-2"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full h-11 px-4 rounded-lg',
            'bg-surface border border-neutral-300',
            'text-neutral-800 placeholder:text-neutral-400',
            'transition-colors duration-normal',
            'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
            'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-neutral-100',
            error && 'border-error-500 focus:border-error-500 focus:ring-error-500/20',
            className,
          )}
          {...props}
        />
        {error ? (
          <p className="mt-1.5 text-sm text-error-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

Input.displayName = 'Input';
