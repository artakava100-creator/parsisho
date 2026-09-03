import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Variant = 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'danger';
type Size = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  fullWidth?: boolean;
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-primary-700 hover:bg-primary-600 text-neutral-800 font-semibold shadow-glow-primary',
  secondary:
    'bg-secondary-600 hover:bg-secondary-500 text-neutral-800 font-semibold',
  accent:
    'bg-accent-600 hover:bg-accent-500 text-neutral-800 font-semibold shadow-glow-accent',
  ghost:
    'bg-transparent hover:bg-surface-overlay text-neutral-600 hover:text-neutral-800',
  outline:
    'border border-neutral-300 hover:border-primary-500 text-neutral-700 hover:text-primary-700 bg-transparent',
  danger:
    'bg-error-600 hover:bg-error-500 text-neutral-800 font-semibold',
};

const sizeStyles: Record<Size, string> = {
  sm: 'h-9 px-4 text-sm rounded-md gap-1.5',
  md: 'h-11 px-6 text-base rounded-lg gap-2',
  lg: 'h-14 px-8 text-lg rounded-xl gap-2.5',
  icon: 'h-10 w-10 rounded-lg justify-center',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      fullWidth = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'inline-flex items-center justify-center transition-all duration-normal ease-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
          'active:scale-[0.97]',
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && 'w-full',
          className,
        )}
        {...props}
      >
        {loading && (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
