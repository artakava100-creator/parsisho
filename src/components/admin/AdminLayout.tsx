import { useState, type ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ChevronLeft, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/providers/useAuth';
import { hasPermission } from '@/lib/permissions';
import { adminNavGroups, findNavItemByPath, type AdminNavItem } from '@/config/admin-navigation';
import { toPersianDigits } from '@/lib/persian';
import { Drawer } from './Drawer';
import { Breadcrumb, buildBreadcrumbs } from './Breadcrumb';

function NavLink({ item, onNavigate }: { item: AdminNavItem; onNavigate?: () => void }) {
  const location = useLocation();
  const { user } = useAuth();
  const isActive = location.pathname === item.to;

  if (item.permission && !hasPermission(user?.role, item.permission)) return null;

  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
        isActive
          ? 'bg-primary-50 text-primary-700 font-medium'
          : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <span className="text-xs bg-primary-100 text-primary-700 px-1.5 py-0.5 rounded-full">
          {toPersianDigits(item.badge)}
        </span>
      )}
    </Link>
  );
}

function NavGroupSection({ group, onNavigate }: { group: typeof adminNavGroups[0]; onNavigate?: () => void }) {
  const location = useLocation();
  const isGroupActive = location.pathname.startsWith(`/admin/${group.id}`);

  return (
    <div>
      <p className={cn(
        'px-3 py-2 text-xs font-bold uppercase tracking-wide mb-1',
        isGroupActive ? 'text-primary-600' : 'text-neutral-400',
      )}>
        {group.label}
      </p>
      <div className="space-y-0.5">
        {group.items.map((item) => (
          <NavLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </div>
    </div>
  );
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-neutral-200 shrink-0">
        <Link to="/admin" onClick={onNavigate} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary-700 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="text-sm font-bold text-neutral-800">پنل مدیریت پارسیشو</span>
        </Link>
      </div>
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-4" aria-label="ناوبری مدیریت">
        {adminNavGroups.map((group) => (
          <NavGroupSection key={group.id} group={group} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="px-4 py-3 border-t border-neutral-200 shrink-0">
        <Link
          to="/"
          onClick={onNavigate}
          className="flex items-center gap-2 text-sm text-neutral-500 hover:text-primary-700 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          بازگشت به سایت
        </Link>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  return (
    <aside className="hidden lg:flex w-64 shrink-0 border-l border-neutral-200 bg-surface h-screen sticky top-0">
      <div className="flex-1 flex flex-col overflow-hidden">
        <SidebarContent />
      </div>
    </aside>
  );
}

export function AdminMobileNav() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg text-neutral-600 hover:bg-neutral-100 transition-colors"
        aria-label="باز کردن منوی مدیریت"
      >
        <Menu className="w-5 h-5" />
      </button>
      <Drawer open={open} onClose={() => setOpen(false)} title="منوی مدیریت" side="right" width="max-w-xs">
        <SidebarContent onNavigate={() => setOpen(false)} />
      </Drawer>
    </>
  );
}

export function AdminHeader() {
  const location = useLocation();
  const { user } = useAuth();
  const navItem = findNavItemByPath(location.pathname);
  const breadcrumbs = buildBreadcrumbs(location.pathname, navItem?.label);

  return (
    <header className="sticky top-0 z-40 bg-surface border-b border-neutral-200 h-14 flex items-center px-4 gap-3">
      <AdminMobileNav />
      <div className="flex-1 min-w-0">
        <Breadcrumb items={breadcrumbs} />
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {user && (
          <span className="text-sm text-neutral-600 hidden sm:block truncate max-w-32">
            {user.displayName}
          </span>
        )}
        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-sm font-bold text-primary-700">
          {user?.displayName?.charAt(0) ?? '?'}
        </div>
      </div>
    </header>
  );
}

interface AdminLayoutProps {
  children: ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="min-h-screen bg-surface-soft flex">
      <AdminSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <AdminHeader />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto" id="admin-content">
          {children}
        </main>
      </div>
    </div>
  );
}

export { X };
