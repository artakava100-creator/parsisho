import { type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';
import { toPersianDigits } from '@/lib/persian';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: { value: number; label: string };
  tone?: 'primary' | 'accent' | 'success' | 'warning' | 'error' | 'neutral';
  className?: string;
}

const toneStyles: Record<NonNullable<StatCardProps['tone']>, string> = {
  primary: 'bg-primary-50 text-primary-700',
  accent: 'bg-accent-50 text-accent-700',
  success: 'bg-success-50 text-success-700',
  warning: 'bg-warning-50 text-warning-700',
  error: 'bg-error-50 text-error-700',
  neutral: 'bg-neutral-100 text-neutral-600',
};

export function StatCard({ label, value, icon: Icon, trend, tone = 'neutral', className }: StatCardProps) {
  const displayValue = typeof value === 'number' ? toPersianDigits(value.toLocaleString('en-US')) : value;

  return (
    <Card glass={false} className={cn('p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-neutral-500 truncate">{label}</p>
          <p className="text-2xl font-bold text-neutral-800 mt-1 font-num">{displayValue}</p>
          {trend && (
            <p className={cn(
              'text-xs mt-1.5',
              trend.value >= 0 ? 'text-success-600' : 'text-error-600',
            )}>
              {trend.value >= 0 ? '▲' : '▼'} {toPersianDigits(Math.abs(trend.value).toString())}٪ {trend.label}
            </p>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0', toneStyles[tone])}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </Card>
  );
}
