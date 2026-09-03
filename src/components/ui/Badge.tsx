import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
type Variant = 'solid' | 'soft' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
}

const toneStyles: Record<Tone, Record<Variant, string>> = {
  primary: {
    solid: 'bg-primary-700 text-neutral-800',
    soft: 'bg-primary-50 text-primary-700',
    outline: 'border border-primary-300 text-primary-700',
  },
  secondary: {
    solid: 'bg-secondary-600 text-neutral-800',
    soft: 'bg-secondary-50 text-secondary-700',
    outline: 'border border-secondary-300 text-secondary-700',
  },
  accent: {
    solid: 'bg-accent-600 text-neutral-800',
    soft: 'bg-accent-50 text-accent-700',
    outline: 'border border-accent-300 text-accent-700',
  },
  success: {
    solid: 'bg-success-500 text-neutral-800',
    soft: 'bg-success-50 text-success-700',
    outline: 'border border-success-300 text-success-700',
  },
  warning: {
    solid: 'bg-warning-500 text-neutral-800',
    soft: 'bg-warning-50 text-warning-700',
    outline: 'border border-warning-300 text-warning-700',
  },
  error: {
    solid: 'bg-error-500 text-neutral-800',
    soft: 'bg-error-50 text-error-700',
    outline: 'border border-error-300 text-error-700',
  },
  neutral: {
    solid: 'bg-neutral-200 text-neutral-800',
    soft: 'bg-neutral-100 text-neutral-600',
    outline: 'border border-neutral-300 text-neutral-500',
  },
};

export function Badge({
  className,
  tone = 'neutral',
  variant = 'soft',
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium',
        toneStyles[tone][variant],
        className,
      )}
      {...props}
    />
  );
}
