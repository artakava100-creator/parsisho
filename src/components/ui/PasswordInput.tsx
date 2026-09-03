import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  hint?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-neutral-700 mb-2">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            type={visible ? 'text' : 'password'}
            id={inputId}
            className={cn(
              'w-full h-11 pl-11 pr-4 rounded-lg',
              'bg-white border border-neutral-300',
              'text-neutral-800 placeholder:text-neutral-500',
              'transition-colors duration-normal',
              'focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error && 'border-error-500 focus:border-error-500 focus:ring-error-500',
              className,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute inset-y-0 left-0 flex items-center px-3 text-neutral-500 hover:text-neutral-700 transition-colors"
            aria-label={visible ? 'پنهان کردن رمز عبور' : 'نمایش رمز عبور'}
            tabIndex={-1}
          >
            {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
        {error ? (
          <p className="mt-1.5 text-sm text-error-600">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>
        ) : null}
      </div>
    );
  },
);

PasswordInput.displayName = 'PasswordInput';
