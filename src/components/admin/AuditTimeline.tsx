import { type LucideIcon } from 'lucide-react';
import { Clock, User } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toPersianDigits } from '@/lib/persian';

export interface AuditEntry {
  id: string;
  actorName: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface AuditTimelineProps {
  entries: AuditEntry[];
  className?: string;
}

function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    const date = new Intl.DateTimeFormat('fa-IR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(d);
    return toPersianDigits(date);
  } catch {
    return ts;
  }
}

export function AuditTimeline({ entries, className }: AuditTimelineProps) {
  if (entries.length === 0) {
    return <p className="text-sm text-neutral-500 py-4 text-center">موردی ثبت نشده است</p>;
  }

  return (
    <div className={cn('space-y-0', className)}>
      {entries.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-neutral-500" />
            </div>
            {i < entries.length - 1 && <div className="w-px flex-1 bg-neutral-200 mt-1" />}
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-neutral-800">{entry.actorName}</span>
              <span className="text-sm text-neutral-500">{entry.action}</span>
            </div>
            {entry.details && <p className="text-xs text-neutral-500 mt-0.5">{entry.details}</p>}
            <div className="flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3 text-neutral-400" />
              <span className="text-xs text-neutral-400">{formatTimestamp(entry.timestamp)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export type { LucideIcon };
