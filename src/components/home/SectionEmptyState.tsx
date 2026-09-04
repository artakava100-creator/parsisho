import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface SectionEmptyStateProps {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function SectionEmptyState({ icon, title, description, action, className }: SectionEmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center text-center py-10 px-4', className)}>
      <div className="w-12 h-12 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-3">
        {icon}
      </div>
      <p className="text-sm font-semibold text-neutral-600">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-neutral-400 max-w-xs">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
