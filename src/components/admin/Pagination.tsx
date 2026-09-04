import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { toPersianDigits } from '@/lib/persian';

interface PaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  pageSize?: number;
  className?: string;
}

export function Pagination({ page, totalPages, onPageChange, totalItems, pageSize, className }: PaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = totalItems != null && pageSize ? (page - 1) * pageSize + 1 : null;
  const endItem = totalItems != null && pageSize ? Math.min(page * pageSize, totalItems) : null;

  const pages: number[] = [];
  const range = 1;
  for (let i = Math.max(1, page - range); i <= Math.min(totalPages, page + range); i++) {
    pages.push(i);
  }

  return (
    <div className={cn('flex flex-col sm:flex-row items-center justify-between gap-3 mt-4', className)}>
      {totalItems != null && startItem != null && endItem != null && (
        <p className="text-sm text-neutral-500">
          نمایش {toPersianDigits(startItem)} تا {toPersianDigits(endItem)} از {toPersianDigits(totalItems)} مورد
        </p>
      )}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="صفحه قبل"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        {pages.map((p) => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={cn(
              'flex items-center justify-center w-8 h-8 rounded-lg text-sm font-medium transition-colors',
              p === page
                ? 'bg-primary-700 text-white'
                : 'text-neutral-600 hover:bg-neutral-100',
            )}
            aria-current={p === page ? 'page' : undefined}
          >
            {toPersianDigits(p)}
          </button>
        ))}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="flex items-center justify-center w-8 h-8 rounded-lg text-neutral-600 hover:bg-neutral-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          aria-label="صفحه بعد"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
