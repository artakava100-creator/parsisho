import { cn } from '@/lib/cn';
import { Flame, Sparkles, Percent, Star } from 'lucide-react';
import type { ReactNode } from 'react';

type BadgeType = 'new' | 'best-seller' | 'discount' | 'special';

interface ProductBadgeProps {
  type: BadgeType;
  label?: string;
  className?: string;
}

const config: Record<BadgeType, { icon: ReactNode; defaultLabel: string; style: string }> = {
  new: {
    icon: <Sparkles className="w-3 h-3" />,
    defaultLabel: 'جدید',
    style: 'bg-success-600 text-white',
  },
  'best-seller': {
    icon: <Flame className="w-3 h-3" />,
    defaultLabel: 'پرفروش',
    style: 'bg-accent-500 text-neutral-900',
  },
  discount: {
    icon: <Percent className="w-3 h-3" />,
    defaultLabel: 'تخفیف',
    style: 'bg-error-500 text-white',
  },
  special: {
    icon: <Star className="w-3 h-3" />,
    defaultLabel: 'ویژه',
    style: 'bg-primary-700 text-white',
  },
};

export function ProductBadge({ type, label, className }: ProductBadgeProps) {
  const c = config[type];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-bold leading-tight',
        c.style,
        className,
      )}
    >
      {c.icon}
      {label ?? c.defaultLabel}
    </span>
  );
}
