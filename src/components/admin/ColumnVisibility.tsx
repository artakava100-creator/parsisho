import { useState, type ReactNode } from 'react';
import { Eye, EyeOff, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/cn';

interface ColumnVisibilityProps {
  columns: { key: string; header: string; hidden?: boolean }[];
  onToggle: (key: string) => void;
  className?: string;
}

export function ColumnVisibility({ columns, onToggle, className }: ColumnVisibilityProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn('relative', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 h-9 rounded-lg border border-neutral-300 text-sm text-neutral-600 hover:bg-neutral-50 transition-colors"
        aria-expanded={open}
        aria-label="نمایش/مخفی کردن ستون‌ها"
      >
        <Eye className="w-4 h-4" />
        <span className="hidden sm:inline">ستون‌ها</span>
        <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute top-full mt-1 left-0 z-20 bg-surface border border-neutral-200 rounded-lg shadow-lg py-1 min-w-48 max-h-64 overflow-y-auto">
            {columns.map((col) => (
              <button
                key={col.key}
                onClick={() => onToggle(col.key)}
                className="flex items-center justify-between w-full px-3 py-2 text-sm text-neutral-700 hover:bg-neutral-50 transition-colors"
              >
                <span>{col.header}</span>
                {col.hidden ? <EyeOff className="w-4 h-4 text-neutral-400" /> : <Eye className="w-4 h-4 text-primary-600" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
