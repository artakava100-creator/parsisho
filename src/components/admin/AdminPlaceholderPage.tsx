import { type LucideIcon, Construction } from 'lucide-react';
import { AdminPageHeader } from './AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from './Breadcrumb';
import { useLocation } from 'react-router-dom';

interface AdminPlaceholderPageProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
}

export function AdminPlaceholderPage({ title, description, icon: Icon = Construction }: AdminPlaceholderPageProps) {
  const location = useLocation();
  const breadcrumbs = buildBreadcrumbs(location.pathname, title);

  return (
    <div>
      <AdminPageHeader
        title={title}
        description={description}
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
      />
      <div className="flex flex-col items-center justify-center text-center py-20 px-6 border border-neutral-200 rounded-lg bg-surface">
        <div className="w-16 h-16 rounded-2xl bg-neutral-100 flex items-center justify-center text-neutral-400 mb-4">
          <Icon className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-bold text-neutral-800">{title}</h2>
        <p className="text-sm text-neutral-500 mt-2 max-w-md">
          این بخش در حال توسعه است و به‌زودی در فاز‌های بعدی فعال خواهد شد.
        </p>
      </div>
    </div>
  );
}
