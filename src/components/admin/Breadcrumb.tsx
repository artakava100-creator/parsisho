import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumb({ items, className }: BreadcrumbProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="مسیر صفحه" className={cn('flex items-center gap-1 text-sm text-neutral-500', className)}>
      <ol className="flex items-center gap-1 flex-wrap">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="flex items-center gap-1">
              {item.to && !isLast ? (
                <Link
                  to={item.to}
                  className="hover:text-primary-700 transition-colors"
                >
                  {item.label}
                </Link>
              ) : (
                <span className={cn(isLast && 'text-neutral-800 font-medium')} aria-current={isLast ? 'page' : undefined}>
                  {item.label}
                </span>
              )}
              {!isLast && <ChevronLeft className="w-3.5 h-3.5 text-neutral-400" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function buildBreadcrumbs(pathname: string, navLabel?: string): BreadcrumbItem[] {
  const items: BreadcrumbItem[] = [
    { label: 'پنل مدیریت', to: '/admin' },
  ];

  if (pathname === '/admin') return items;

  if (pathname.startsWith('/admin/marketplace')) {
    items.push({ label: 'مرکز کنترل بازار', to: '/admin/marketplace' });
    if (pathname !== '/admin/marketplace' && navLabel) {
      items.push({ label: navLabel });
    }
  } else if (pathname.startsWith('/admin/system')) {
    items.push({ label: 'مدیریت سیستم', to: '/admin/system' });
    if (pathname !== '/admin/system' && navLabel) {
      items.push({ label: navLabel });
    }
  }

  return items;
}
