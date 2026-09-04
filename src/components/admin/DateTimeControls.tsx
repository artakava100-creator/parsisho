import { type ReactNode } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/cn';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  className?: string;
}

export function DateRangePicker({ startDate, endDate, onStartDateChange, onEndDateChange, className }: DateRangePickerProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="relative">
        <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        <input
          type="date"
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          className="h-9 pr-8 pl-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          aria-label="تاریخ شروع"
        />
      </div>
      <span className="text-neutral-400 text-sm">تا</span>
      <div className="relative">
        <Calendar className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400 pointer-events-none" />
        <input
          type="date"
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          className="h-9 pr-8 pl-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-800 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          aria-label="تاریخ پایان"
        />
      </div>
    </div>
  );
}

interface ScheduleControlProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  children: ReactNode;
  className?: string;
}

export function ScheduleControl({ enabled, onToggle, children, className }: ScheduleControlProps) {
  return (
    <div className={cn('space-y-3', className)}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => onToggle(e.target.checked)}
          className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
        />
        <span className="text-sm text-neutral-700">فعال‌سازی زمان‌بندی</span>
      </label>
      {enabled && children}
    </div>
  );
}
