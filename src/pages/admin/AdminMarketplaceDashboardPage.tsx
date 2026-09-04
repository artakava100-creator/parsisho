import { Link, useLocation } from 'react-router-dom';
import {
  Package, FolderTree, Tag, Layers, Store, Plus, ArrowLeft,
  CheckCircle2, Clock, PauseCircle, Gavel, Gamepad2, Building2, Megaphone,
  AlertCircle,
} from 'lucide-react';
import { useAdminProducts } from '@/hooks/useAdminProduct';
import { useAdminCategories } from '@/hooks/useAdminCategory';
import { useAdminBrands } from '@/hooks/useAdminBrand';
import { useAdminStorefrontSections } from '@/hooks/useAdminStorefront';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
import { StatCard } from '@/components/admin/StatCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { LoadingState, ErrorState } from '@/components/admin/LoadingErrorState';
import { Card } from '@/components/ui/Card';
import { toPersianDigits } from '@/lib/persian';
import type { AdminProductListItem } from '@/types';

const quickActions = [
  { to: '/admin/marketplace/products/new', label: 'افزودن محصول', icon: Plus },
  { to: '/admin/marketplace/products', label: 'مدیریت محصولات', icon: Package },
  { to: '/admin/marketplace/categories', label: 'مدیریت دسته‌بندی‌ها', icon: FolderTree },
  { to: '/admin/marketplace/brands', label: 'مدیریت برندها', icon: Tag },
  { to: '/admin/marketplace/attributes', label: 'مدیریت ویژگی‌ها', icon: Layers },
  { to: '/admin/marketplace/storefront', label: 'مدیریت Storefront', icon: Store },
];

const moduleLinks = [
  { to: '/admin/marketplace/products', label: 'محصولات', icon: Package, desc: 'کاتالوگ و چرخه عمر محصولات' },
  { to: '/admin/marketplace/categories', label: 'دسته‌بندی‌ها', icon: FolderTree, desc: 'درخت دسته‌بندی محصولات' },
  { to: '/admin/marketplace/brands', label: 'برندها', icon: Tag, desc: 'مدیریت برندهای بازار' },
  { to: '/admin/marketplace/attributes', label: 'ویژگی‌ها و تنوع‌ها', icon: Layers, desc: 'تعریف ویژگی‌ها و تنوع‌های محصول' },
  { to: '/admin/marketplace/storefront', label: 'Storefront', icon: Store, desc: 'بخش‌ها و چیدمان صفحه فروشگاه' },
  { to: '/admin/marketplace/auctions', label: 'مزایده‌ها', icon: Gavel, desc: 'مدیریت مزایده‌ها' },
  { to: '/admin/marketplace/engagement', label: 'سرزمین هیجان', icon: Gamepad2, desc: 'دورهای بازی حدس بزن' },
  { to: '/admin/marketplace/businesses', label: 'کسب‌وکارها', icon: Building2, desc: 'کسب‌وکارهای محلی' },
  { to: '/admin/marketplace/ads', label: 'تبلیغات', icon: Megaphone, desc: 'تبلیغات و موقعیت‌ها' },
];

function countByStatus(items: AdminProductListItem[] | undefined, status: string): number {
  if (!items) return 0;
  return items.filter((p) => p.status === status).length;
}

export function AdminMarketplaceDashboardPage() {
  const location = useLocation();
  const breadcrumbs = buildBreadcrumbs(location.pathname, 'نمای کلی بازار');

  const productsQuery = useAdminProducts({ limit: 100 });
  const categoriesQuery = useAdminCategories();
  const brandsQuery = useAdminBrands();
  const storefrontQuery = useAdminStorefrontSections();

  const isLoading = productsQuery.isLoading || categoriesQuery.isLoading || brandsQuery.isLoading || storefrontQuery.isLoading;
  const hasError = productsQuery.error || categoriesQuery.error || brandsQuery.error || storefrontQuery.error;

  if (isLoading) {
    return (
      <div>
        <AdminPageHeader
          title="مرکز کنترل بازار"
          description="نمای کلی وضعیت بازار"
          breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        />
        <LoadingState label="در حال بارگذاری داده‌های بازار..." />
      </div>
    );
  }

  if (hasError) {
    return (
      <div>
        <AdminPageHeader
          title="مرکز کنترل بازار"
          description="نمای کلی وضعیت بازار"
          breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        />
        <ErrorState
          message="خطا در بارگذاری اطلاعات بازار"
          onRetry={() => {
            productsQuery.refetch();
            categoriesQuery.refetch();
            brandsQuery.refetch();
            storefrontQuery.refetch();
          }}
        />
      </div>
    );
  }

  const products = productsQuery.data?.items ?? [];
  const categories = categoriesQuery.data ?? [];
  const brands = brandsQuery.data ?? [];
  const storefrontSections = storefrontQuery.data ?? [];

  const activeProducts = countByStatus(products, 'published');
  const pendingProducts = countByStatus(products, 'review') + countByStatus(products, 'scheduled');
  const pausedProducts = countByStatus(products, 'paused');
  const draftProducts = countByStatus(products, 'draft');
  const archivedProducts = countByStatus(products, 'archived');

  const activeStorefrontSections = storefrontSections.filter((s) => s.isEnabled).length;
  const inactiveStorefrontSections = storefrontSections.filter((s) => !s.isEnabled).length;
  const scheduledProducts = products.filter((p) => p.status === 'scheduled' && p.publishAt);

  const latestProducts = [...products]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 6);

  return (
    <div>
      <AdminPageHeader
        title="مرکز کنترل بازار"
        description="نمای کلی وضعیت بازار و دسترسی سریع به بخش‌های مدیریت"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard
          label="محصولات فعال"
          value={activeProducts}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="در انتظار بررسی/انتشار"
          value={pendingProducts}
          icon={Clock}
          tone="warning"
        />
        <StatCard
          label="محصولات متوقف"
          value={pausedProducts}
          icon={PauseCircle}
          tone="error"
        />
        <StatCard
          label="دسته‌بندی‌ها"
          value={categories.length}
          icon={FolderTree}
          tone="primary"
        />
        <StatCard
          label="برندها"
          value={brands.length}
          icon={Tag}
          tone="neutral"
        />
      </div>

      {/* Secondary stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="پیش‌نویس" value={draftProducts} icon={Package} tone="neutral" />
        <StatCard label="بایگانی" value={archivedProducts} icon={Package} tone="neutral" />
        <StatCard
          label="بخش‌های فعال Storefront"
          value={activeStorefrontSections}
          icon={Store}
          tone="success"
        />
        <StatCard
          label="بخش‌های غیرفعال Storefront"
          value={inactiveStorefrontSections}
          icon={Store}
          tone="warning"
        />
      </div>

      {/* Two-column layout: Product overview + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Product overview */}
        <div className="lg:col-span-2">
          <Card glass={false} className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-bold text-neutral-800">آخرین محصولات</h2>
              <Link
                to="/admin/marketplace/products"
                className="text-xs text-primary-700 hover:text-primary-600 font-medium flex items-center gap-1"
              >
                همه محصولات
                <ArrowLeft className="w-3 h-3" />
              </Link>
            </div>

            {latestProducts.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-sm text-neutral-400">هنوز محصولی ثبت نشده است</p>
                <Link
                  to="/admin/marketplace/products/new"
                  className="inline-flex items-center gap-1 mt-3 text-sm text-primary-700 hover:text-primary-600 font-medium"
                >
                  <Plus className="w-4 h-4" />
                  ایجاد اولین محصول
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-100">
                      <th className="text-right font-medium text-neutral-400 px-2 py-2">نام محصول</th>
                      <th className="text-right font-medium text-neutral-400 px-2 py-2 hidden sm:table-cell">دسته‌بندی</th>
                      <th className="text-right font-medium text-neutral-400 px-2 py-2">وضعیت</th>
                      <th className="text-right font-medium text-neutral-400 px-2 py-2 hidden md:table-cell">برند</th>
                    </tr>
                  </thead>
                  <tbody>
                    {latestProducts.map((product) => (
                      <tr
                        key={product.id}
                        className="border-b border-neutral-50 hover:bg-neutral-50/50 transition-colors"
                      >
                        <td className="px-2 py-2.5">
                          <Link
                            to={`/admin/marketplace/products/${product.id}`}
                            className="text-sm font-medium text-neutral-800 hover:text-primary-700 transition-colors"
                          >
                            {product.name}
                          </Link>
                          <p className="text-xs text-neutral-400 mt-0.5">{product.slug}</p>
                        </td>
                        <td className="px-2 py-2.5 hidden sm:table-cell">
                          <span className="text-xs text-neutral-500">{product.categoryName ?? '—'}</span>
                        </td>
                        <td className="px-2 py-2.5">
                          <StatusBadge status={product.status} />
                        </td>
                        <td className="px-2 py-2.5 hidden md:table-cell">
                          <span className="text-xs text-neutral-500">{product.brandName ?? '—'}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>

        {/* Quick Actions */}
        <div>
          <Card glass={false} className="p-5">
            <h2 className="text-sm font-bold text-neutral-800 mb-4">اقدامات سریع</h2>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link
                    key={action.to}
                    to={action.to}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border border-neutral-200 hover:border-primary-300 hover:bg-primary-50/50 transition-colors group"
                  >
                    <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0 group-hover:bg-primary-50 group-hover:border-primary-200 transition-colors">
                      <Icon className="w-4 h-4 text-neutral-500 group-hover:text-primary-600 transition-colors" />
                    </div>
                    <span className="text-sm text-neutral-700 group-hover:text-primary-700 transition-colors">
                      {action.label}
                    </span>
                    <ArrowLeft className="w-3.5 h-3.5 text-neutral-300 mr-auto group-hover:text-primary-400 transition-colors" />
                  </Link>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      {/* Operational status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Scheduled products */}
        <Card glass={false} className="p-5">
          <h2 className="text-sm font-bold text-neutral-800 mb-3">محصولات زمان‌بندی‌شده</h2>
          {scheduledProducts.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4">محصول زمان‌بندی‌شده‌ای وجود ندارد</p>
          ) : (
            <div className="space-y-2">
              {scheduledProducts.slice(0, 5).map((product) => (
                <Link
                  key={product.id}
                  to={`/admin/marketplace/products/${product.id}`}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-neutral-100 hover:bg-neutral-50/50 transition-colors"
                >
                  <span className="text-sm text-neutral-700 truncate">{product.name}</span>
                  <span className="text-xs text-neutral-400 shrink-0">
                    {product.publishAt
                      ? toPersianDigits(
                          new Date(product.publishAt).toLocaleDateString('fa-IR', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                          })
                        )
                      : '—'}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </Card>

        {/* Storefront status */}
        <Card glass={false} className="p-5">
          <h2 className="text-sm font-bold text-neutral-800 mb-3">وضعیت Storefront</h2>
          {storefrontSections.length === 0 ? (
            <p className="text-sm text-neutral-400 py-4">بخش Storefrontی تعریف نشده است</p>
          ) : (
            <div className="space-y-2">
              {storefrontSections.slice(0, 6).map((section) => (
                <div
                  key={section.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-neutral-100"
                >
                  <span className="text-sm text-neutral-700 truncate">{section.title}</span>
                  <StatusBadge status={section.isEnabled ? 'active' : 'inactive'} />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Marketplace modules */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-neutral-600" />
          <h2 className="text-sm font-bold text-neutral-700">بخش‌های بازار</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {moduleLinks.map((mod) => {
            const Icon = mod.icon;
            return (
              <Link key={mod.to} to={mod.to}>
                <Card glass={false} className="p-4 h-full hover:border-primary-300 hover:bg-primary-50/30 transition-colors cursor-pointer group">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-neutral-50 border border-neutral-200 flex items-center justify-center shrink-0 group-hover:bg-primary-50 group-hover:border-primary-200 transition-colors">
                      <Icon className="w-4 h-4 text-neutral-500 group-hover:text-primary-600 transition-colors" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-neutral-800 mb-0.5">{mod.label}</h3>
                      <p className="text-xs text-neutral-500 leading-relaxed">{mod.desc}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
