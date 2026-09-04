import { Badge } from '@/components/ui/Badge';
import { cn } from '@/lib/cn';

type Status = 'active' | 'inactive' | 'pending' | 'draft' | 'review' | 'published' | 'paused' | 'archived' | 'suspended' | 'disabled' | 'restricted' | 'live' | 'ended' | 'cancelled' | 'scheduled' | 'paid' | 'unpaid' | 'failed' | 'completed' | 'success';

interface StatusBadgeProps {
  status: Status | string;
  className?: string;
}

const statusConfig: Record<string, { tone: 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'primary'; label: string }> = {
  active: { tone: 'success', label: 'فعال' },
  inactive: { tone: 'neutral', label: 'غیرفعال' },
  pending: { tone: 'warning', label: 'در انتظار' },
  draft: { tone: 'neutral', label: 'پیش‌نویس' },
  review: { tone: 'info', label: 'در بازبینی' },
  published: { tone: 'success', label: 'منتشر شده' },
  paused: { tone: 'warning', label: 'متوقف شده' },
  archived: { tone: 'neutral', label: 'بایگانی' },
  suspended: { tone: 'error', label: 'معلق' },
  disabled: { tone: 'error', label: 'غیرفعال' },
  restricted: { tone: 'warning', label: 'محدود' },
  live: { tone: 'error', label: 'زنده' },
  ended: { tone: 'neutral', label: 'پایان یافته' },
  cancelled: { tone: 'error', label: 'لغو شده' },
  scheduled: { tone: 'info', label: 'برنامه‌ریزی شده' },
  paid: { tone: 'success', label: 'پرداخت شده' },
  unpaid: { tone: 'warning', label: 'پرداخت نشده' },
  failed: { tone: 'error', label: 'ناموفق' },
  completed: { tone: 'success', label: 'تکمیل شده' },
  success: { tone: 'success', label: 'موفق' },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { tone: 'neutral' as const, label: status };

  return (
    <Badge tone={config.tone} variant="soft" className={cn('whitespace-nowrap', className)}>
      {config.label}
    </Badge>
  );
}
