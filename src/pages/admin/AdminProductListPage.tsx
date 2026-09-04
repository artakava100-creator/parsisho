import { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import {
  useAdminProducts,
  useDeleteProduct,
  useTransitionProductStatus,
} from '@/hooks/useAdminProduct';
import { useAdminCategories } from '@/hooks/useAdminCategory';
import { useAdminBrands } from '@/hooks/useAdminBrand';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SearchInput, FilterBar } from '@/components/admin/FilterBar';
import { LoadingState, ErrorState } from '@/components/admin/LoadingErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { useToast } from '@/providers/useToast';
import { toPersianDigits } from '@/lib/persian';
import type { AdminProductListItem, ProductStatus } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'review', label: 'در بازبینی' },
  { value: 'scheduled', label: 'زمان‌بندی‌شده' },
  { value: 'published', label: 'منتشر شده' },
  { value: 'paused', label: 'متوقف شده' },
  { value: 'archived', label: 'بایگانی' },
];

const STATUS_LABELS: Record<ProductStatus, string> = {
  draft: 'پیش‌نویس',
  review: 'در بازبینی',
  scheduled: 'زمان‌بندی‌شده',
  published: 'منتشر شده',
  paused: 'متوقف شده',
  archived: 'بایگانی',
};

const ALLOWED_TRANSITIONS: Record<ProductStatus, ProductStatus[]> = {
  draft: ['review'],
  review: ['scheduled', 'draft'],
  scheduled: ['published'],
  published: ['paused', 'archived'],
  paused: ['published', 'archived'],
  archived: ['draft'],
};

export function AdminProductListPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { show } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const [deleteTarget, setDeleteTarget] = useState<AdminProductListItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useAdminProducts({
    search: search || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    categoryId: categoryFilter !== 'all' ? categoryFilter : undefined,
    brandId: brandFilter !== 'all' ? brandFilter : undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const { data: categories } = useAdminCategories();
  const { data: brands } = useAdminBrands();
  const deleteMutation = useDeleteProduct();
  const transitionMutation = useTransitionProductStatus();

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'محصولات');

  const products = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / pageSize);

  const handleTransition = async (product: AdminProductListItem, newStatus: ProductStatus) => {
    try {
      await transitionMutation.mutateAsync({ productId: product.id, newStatus });
      show('success', `وضعیت به «${STATUS_LABELS[newStatus]}» تغییر یافت`);
    } catch (err) {
      show('error', 'خطا در تغییر وضعیت', (err as { message?: string })?.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      show('success', 'محصول حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف محصول');
    }
  };

  const columns: Column<AdminProductListItem>[] = [
    {
      key: 'name',
      header: 'نام محصول',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-neutral-800">{row.name}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'categoryName',
      header: 'دسته‌بندی',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-600">{row.categoryName ?? '—'}</span>
      ),
    },
    {
      key: 'brandName',
      header: 'برند',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-600">{row.brandName ?? '—'}</span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/marketplace/products/${row.id}`); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            aria-label="مشاهده"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/admin/marketplace/products/${row.id}`); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            aria-label="ویرایش"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {ALLOWED_TRANSITIONS[row.status].length > 0 && (
            <select
              value=""
              onChange={(e) => {
                e.stopPropagation();
                if (e.target.value) handleTransition(row, e.target.value as ProductStatus);
              }}
              className="h-7 px-1 text-xs rounded border border-neutral-300 bg-surface text-neutral-600 focus:outline-none focus:border-primary-500"
            >
              <option value="">تغییر وضعیت...</option>
              {ALLOWED_TRANSITIONS[row.status].map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          )}
          {row.status === 'archived' && (
            <button
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); setDeleteError(null); }}
              className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors"
              aria-label="حذف"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="مدیریت محصولات"
        description="مدیریت کاتالوگ محصولات بازار"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        actions={
          <Button size="sm" onClick={() => navigate('/admin/marketplace/products/new')}>
            <Plus className="w-4 h-4" />
            محصول جدید
          </Button>
        }
      />

      <div className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در محصولات..."
            className="flex-1 max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            className="h-9 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => { setCategoryFilter(e.target.value); setPage(0); }}
            className="h-9 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            {(categories ?? []).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          <select
            value={brandFilter}
            onChange={(e) => { setBrandFilter(e.target.value); setPage(0); }}
            className="h-9 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            <option value="all">همه برندها</option>
            {(brands ?? []).map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </FilterBar>
      </div>

      {isLoading ? (
        <LoadingState label="در حال بارگذاری محصولات..." />
      ) : error ? (
        <ErrorState message="خطا در بارگذاری محصولات" onRetry={() => refetch()} />
      ) : products.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-8 h-8" />}
          title="محصولی یافت نشد"
          description={search || statusFilter !== 'all' ? 'با فیلترهای انتخاب‌شده محصولی وجود ندارد' : 'هنوز محصولی ایجاد نشده است'}
          action={
            <Button size="sm" onClick={() => navigate('/admin/marketplace/products/new')}>
              <Plus className="w-4 h-4" />
              ایجاد اولین محصول
            </Button>
          }
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={products}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(`/admin/marketplace/products/${row.id}`)}
          />
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-neutral-500">
                {toPersianDigits(page * pageSize + 1)}–{toPersianDigits(Math.min((page + 1) * pageSize, total))} از {toPersianDigits(total)}
              </p>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
                  قبلی
                </Button>
                <span className="text-sm text-neutral-500 self-center px-2">
                  {toPersianDigits(page + 1)} / {toPersianDigits(totalPages)}
                </span>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}>
                  بعدی
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="حذف محصول"
        message={`آیا از حذف محصول «${deleteTarget?.name ?? ''}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
        confirmLabel="حذف"
        loading={deleteMutation.isPending}
      />
      {deleteError && (
        <div className="fixed bottom-4 left-4 z-[100] px-4 py-3 rounded-lg bg-error-50 border border-error-200 text-sm text-error-700 max-w-sm">
          {deleteError}
        </div>
      )}
    </div>
  );
}
