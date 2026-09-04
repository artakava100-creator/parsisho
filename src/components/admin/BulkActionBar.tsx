import { type ReactNode } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';

interface BulkActionBarProps {
  selectedCount: number;
  actions: ReactNode;
  onClear: () => void;
  className?: string;
}

export function BulkActionBar({ selectedCount, actions, onClear, className }: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className={cn(
      'flex items-center justify-between gap-3 px-4 py-2.5 bg-primary-50 border border-primary-200 rounded-lg',
      className,
    )}>
      <div className="flex items-center gap-2 text-sm">
        <span className="font-medium text-primary-700">
          {selectedCount} مورد انتخاب شده
        </span>
        <button
          onClick={onClear}
          className="flex items-center justify-center w-6 h-6 rounded text-primary-600 hover:bg-primary-100 transition-colors"
          aria-label="پاک کردن انتخاب"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  );
}
