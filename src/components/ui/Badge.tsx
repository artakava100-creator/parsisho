import type { HTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

type Tone = 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'local';
type Variant = 'solid' | 'soft' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  variant?: Variant;
}

const toneStyles: Record<Tone, Record<Variant, string>> = {
  primary: {
    solid: 'bg-primary-700 text-white',
    soft: 'bg-primary-50 text-primary-700',
    outline: 'border border-primary-300 text-primary-700',
  },
  accent: {
    solid: 'bg-accent-500 text-neutral-900',
    soft: 'bg-accent-50 text-accent-700',
    outline: 'border border-accent-300 text-accent-700',
  },
  success: {
    solid: 'bg-success-600 text-white',
    soft: 'bg-success-50 text-success-700',
    outline: 'border border-success-300 text-success-700',
  },
  warning: {
    solid: 'bg-warning-500 text-neutral-900',
    soft: 'bg-warning-50 text-warning-700',
    outline: 'border border-warning-300 text-warning-700',
  },
  error: {
    solid: 'bg-error-600 text-white',
    soft: 'bg-error-50 text-error-700',
    outline: 'border border-error-300 text-error-700',
  },
  info: {
    solid: 'bg-info-500 text-white',
    soft: 'bg-info-50 text-info-700',
    outline: 'border border-info-300 text-info-700',
  },
  local: {
    solid: 'bg-local-600 text-white',
    soft: 'bg-local-50 text-local-700',
    outline: 'border border-local-300 text-local-700',
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
