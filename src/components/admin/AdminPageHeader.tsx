import { type ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface AdminPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  breadcrumbs?: ReactNode;
  className?: string;
}

export function AdminPageHeader({ title, description, actions, breadcrumbs, className }: AdminPageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {breadcrumbs && <div className="mb-2">{breadcrumbs}</div>}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-neutral-800">{title}</h1>
          {description && <p className="text-sm text-neutral-500 mt-1">{description}</p>}
        </div>
        {actions && <div className="flex items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </div>
  );
}
