import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Mail, Trash2, Power, CheckCircle2, XCircle, Users } from 'lucide-react';
import {
  useNewsletterSubscribers,
  useNewsletterStats,
  useUpdateSubscriberStatus,
  useDeleteSubscriber,
} from '@/hooks/useAdminNewsletter';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SearchInput, FilterBar } from '@/components/admin/FilterBar';
import { LoadingState, ErrorState } from '@/components/admin/LoadingErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { StatCard } from '@/components/admin/StatCard';
import { Pagination } from '@/components/admin/Pagination';
import { useToast } from '@/providers/useToast';
import { toPersianDigits } from '@/lib/persian';
import { formatJalaliShort, formatTime } from '@/lib/jalali';
import type { NewsletterSubscriber } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'active', label: 'فعال' },
  { value: 'unsubscribed', label: 'لغو اشتراک' },
];

const PAGE_SIZE = 20;

export function AdminNewsletterPage() {
  const location = useLocation();
  const { show } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<NewsletterSubscriber | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'خبرنامه');

  const { data: stats, isLoading: statsLoading } = useNewsletterStats();
  const { data: listData, isLoading, error, refetch } = useNewsletterSubscribers(
    search,
    statusFilter,
    page,
    PAGE_SIZE,
  );
  const updateStatusMutation = useUpdateSubscriberStatus();
  const deleteMutation = useDeleteSubscriber();

  const subscribers = listData?.items ?? [];
  const total = listData?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const handleToggleStatus = async (subscriber: NewsletterSubscriber) => {
    const newStatus = subscriber.status === 'active' ? 'unsubscribed' : 'active';
    try {
      await updateStatusMutation.mutateAsync({ subscriberId: subscriber.id, status: newStatus });
      show('success', newStatus === 'active' ? 'اشتراک فعال شد' : 'اشتراک لغو شد');
    } catch (err) {
      show('error', 'خطا در تغییر وضعیت', (err as { message?: string })?.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      show('success', 'مشترک حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف مشترک');
    }
  };

  const columns: Column<NewsletterSubscriber>[] = [
    {
      key: 'email',
      header: 'ایمیل',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary-50 text-primary-700">
            <Mail className="w-4 h-4" />
          </div>
          <span className="text-sm text-neutral-800 font-medium truncate" dir="ltr">
            {row.email}
          </span>
        </div>
      ),
    },
    {
      key: 'subscribed_at',
      header: 'تاریخ عضویت',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-neutral-500">
          {formatJalaliShort(new Date(row.subscribedAt))} - {formatTime(new Date(row.subscribedAt))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => (
        <StatusBadge status={row.status === 'active' ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleStatus(row); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            aria-label={row.status === 'active' ? 'لغو اشتراک' : 'فعال‌سازی'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); setDeleteError(null); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors"
            aria-label="حذف"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="مدیریت خبرنامه"
        description="مدیریت مشترکین خبرنامه ایمیل"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
      />

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        <StatCard label="کل مشترکین" value={stats?.total ?? 0} icon={Users} tone="neutral" />
        <StatCard label="فعال" value={stats?.active ?? 0} icon={CheckCircle2} tone="success" />
        <StatCard label="لغو اشتراک" value={stats?.unsubscribed ?? 0} icon={XCircle} tone="error" />
      </div>

      {/* Filter bar */}
      <div className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="جستجو در ایمیل‌ها..."
            className="flex-1 max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="h-9 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FilterBar>
      </div>

      {/* Data table */}
      {isLoading ? (
        <LoadingState label="در حال بارگذاری مشترکین..." />
      ) : error ? (
        <ErrorState message="خطا در بارگذاری مشترکین" onRetry={() => refetch()} />
      ) : subscribers.length === 0 ? (
        <EmptyState
          icon={<Mail className="w-8 h-8" />}
          title="مشترکی یافت نشد"
          description={search || statusFilter !== 'all' ? 'با فیلترهای انتخاب‌شده مشترکی وجود ندارد' : 'هنوز مشترکی در خبرنامه ثبت نشده است'}
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={subscribers}
            rowKey={(row) => row.id}
          />
          {totalPages > 1 && (
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          )}
        </>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="حذف مشترک"
        message={`آیا از حذف ایمیل «${deleteTarget?.email ?? ''}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
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
