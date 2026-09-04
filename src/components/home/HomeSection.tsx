import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface HomeSectionProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}

export function HomeSection({ title, action, children, className, id }: HomeSectionProps) {
  return (
    <section id={id} className={cn('max-w-7xl mx-auto px-4 sm:px-6 lg:px-8', className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h2 className="text-lg sm:text-xl font-extrabold text-neutral-800">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}
