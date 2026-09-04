import { type ReactNode, useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronsUpDown, ArrowUpDown } from 'lucide-react';
import { cn } from '@/lib/cn';

export type SortDirection = 'asc' | 'desc' | null;

export interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => ReactNode;
  sortable?: boolean;
  sortAccessor?: (row: T) => string | number;
  width?: string;
  align?: 'right' | 'left' | 'center';
  hideOnMobile?: boolean;
}

interface SortableHeaderProps {
  label: string;
  direction: SortDirection;
  onClick: () => void;
  align?: 'right' | 'left' | 'center';
}

export function SortableHeader({ label, direction, onClick, align = 'right' }: SortableHeaderProps) {
  const Icon = direction === 'asc' ? ChevronUp : direction === 'desc' ? ChevronDown : ChevronsUpDown;
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-neutral-500 hover:text-neutral-800 transition-colors',
        align === 'left' && 'justify-start',
        align === 'center' && 'justify-center',
        align === 'right' && 'justify-start',
      )}
    >
      {label}
      <Icon className={cn('w-3.5 h-3.5', direction && 'text-primary-600')} />
    </button>
  );
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string;
  loading?: boolean;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  selectable?: boolean;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
  onRowClick?: (row: T) => void;
  sortKey?: string;
  sortDirection?: SortDirection;
  onSort?: (key: string, direction: SortDirection) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  rowKey,
  loading,
  emptyState,
  errorState,
  selectable,
  selectedIds,
  onSelectionChange,
  onRowClick,
  sortKey,
  sortDirection,
  onSort,
  className,
}: DataTableProps<T>) {
  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    let newDir: SortDirection = 'asc';
    if (sortKey === col.key) {
      if (sortDirection === 'asc') newDir = 'desc';
      else if (sortDirection === 'desc') newDir = null;
    }
    onSort(col.key, newDir);
  };

  const allSelected = selectable && data.length > 0 && selectedIds?.size === data.length;
  const someSelected = selectable && selectedIds && selectedIds.size > 0 && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) onSelectionChange(new Set());
    else onSelectionChange(new Set(data.map(rowKey)));
  };

  const toggleRow = (id: string) => {
    if (!onSelectionChange || !selectedIds) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  if (loading) {
    return (
      <div className="border border-neutral-200 rounded-lg overflow-hidden bg-surface">
        <div className="space-y-0">
          <div className="h-11 bg-neutral-50 border-b border-neutral-200" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 border-b border-neutral-100 animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  if (errorState) {
    return <div className="border border-neutral-200 rounded-lg bg-surface p-6">{errorState}</div>;
  }

  if (data.length === 0 && emptyState) {
    return <div className="border border-neutral-200 rounded-lg bg-surface">{emptyState}</div>;
  }

  return (
    <div className={cn('border border-neutral-200 rounded-lg overflow-hidden bg-surface', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-50 border-b border-neutral-200">
              {selectable && (
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={!!allSelected}
                    ref={(el) => { if (el) el.indeterminate = !!someSelected; }}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                    aria-label="انتخاب همه"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    'px-3 py-3 text-right',
                    col.hideOnMobile && 'hidden md:table-cell',
                    col.width,
                  )}
                >
                  {col.sortable && onSort ? (
                    <SortableHeader
                      label={col.header}
                      direction={sortKey === col.key ? (sortDirection ?? null) : null}
                      onClick={() => handleSort(col)}
                      align={col.align}
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">
                      {col.header}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const id = rowKey(row);
              const isSelected = selectedIds?.has(id);
              return (
                <tr
                  key={id}
                  className={cn(
                    'border-b border-neutral-100 last:border-0 transition-colors',
                    onRowClick && 'cursor-pointer',
                    isSelected ? 'bg-primary-50/50' : 'hover:bg-neutral-50',
                  )}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {selectable && (
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={!!isSelected}
                        onChange={() => toggleRow(id)}
                        className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                        aria-label={`انتخاب ردیف ${id}`}
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        'px-3 py-3 text-neutral-700',
                        col.hideOnMobile && 'hidden md:table-cell',
                        col.align === 'center' && 'text-center',
                        col.align === 'left' && 'text-left',
                      )}
                    >
                      {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
