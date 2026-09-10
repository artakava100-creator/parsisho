import { useState, useMemo, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Plus, ArrowUp, ArrowDown, Pencil, Trash2, Power, Eye, EyeOff,
  Copy, Sparkles, Package, CheckCircle2, XCircle, Globe, Link2,
  Upload, Loader2, ImageIcon,
} from 'lucide-react';
import {
  useAdminSpecialItems,
  useCreateSpecialItem,
  useUpdateSpecialItem,
  useDeleteSpecialItem,
  useReorderSpecialItems,
  useToggleSpecialItem,
  useDuplicateSpecialItem,
} from '@/hooks/useAdminSpecial';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { SearchInput, FilterBar } from '@/components/admin/FilterBar';
import { LoadingState, ErrorState } from '@/components/admin/LoadingErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/admin/Drawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { FormSection, FormField, FormRow, FormActions } from '@/components/admin/FormControls';
import { Input } from '@/components/ui/Input';
import { StatCard } from '@/components/admin/StatCard';
import { useToast } from '@/providers/useToast';
import { supabase } from '@/lib/supabase';
import { toPersianDigits } from '@/lib/persian';
import { specialIconMap, specialIconOptions } from '@/config/home-sections';
import { SpecialCard } from '@/components/home/SpecialCard';
import { cn } from '@/lib/cn';
import type { SpecialItem, CreateSpecialItemInput, UpdateSpecialItemInput } from '@/types';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'published', label: 'منتشر شده' },
  { value: 'unpublished', label: 'منتشر نشده' },
  { value: 'enabled', label: 'فعال' },
  { value: 'disabled', label: 'غیرفعال' },
];

interface FormData {
  title: string;
  description: string;
  icon: string;
  imageUrl: string | null;
  destinationUrl: string;
  displayOrder: number;
  isPublished: boolean;
  isEnabled: boolean;
}

const defaultFormData: FormData = {
  title: '',
  description: '',
  icon: 'sparkles',
  imageUrl: null,
  destinationUrl: '#',
  displayOrder: 0,
  isPublished: true,
  isEnabled: true,
};

export function AdminSpecialPage() {
  const location = useLocation();
  const { show } = useToast();
  const { data: items, isLoading, error, refetch } = useAdminSpecialItems();
  const createMutation = useCreateSpecialItem();
  const updateMutation = useUpdateSpecialItem();
  const deleteMutation = useDeleteSpecialItem();
  const reorderMutation = useReorderSpecialItems();
  const toggleMutation = useToggleSpecialItem();
  const duplicateMutation = useDuplicateSpecialItem();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SpecialItem | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'مدیریت ویژه');

  // ── Dashboard stats ──
  const stats = useMemo(() => {
    if (!items) return { total: 0, active: 0, inactive: 0, published: 0, unpublished: 0 };
    return {
      total: items.length,
      active: items.filter((i) => i.isEnabled).length,
      inactive: items.filter((i) => !i.isEnabled).length,
      published: items.filter((i) => i.isPublished).length,
      unpublished: items.filter((i) => !i.isPublished).length,
    };
  }, [items]);

  // ── Filtered + sorted items ──
  const filteredItems = useMemo(() => {
    if (!items) return [];
    return items.filter((item) => {
      const matchesSearch = !search ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        (item.description ?? '').toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' && item.isPublished) ||
        (statusFilter === 'unpublished' && !item.isPublished) ||
        (statusFilter === 'enabled' && item.isEnabled) ||
        (statusFilter === 'disabled' && !item.isEnabled);
      return matchesSearch && matchesStatus;
    });
  }, [items, search, statusFilter]);

  // ── Drawer handlers ──
  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData, displayOrder: items?.length ?? 0 });
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (item: SpecialItem) => {
    setEditingId(item.id);
    setFormData({
      title: item.title,
      description: item.description ?? '',
      icon: item.icon,
      imageUrl: item.imageUrl,
      destinationUrl: item.destinationUrl,
      displayOrder: item.displayOrder,
      isPublished: item.isPublished,
      isEnabled: item.isEnabled,
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.title.trim() || formData.title.trim().length < 2) {
      setFormError('عنوان حداقل ۲ نویسه باید باشد');
      return;
    }
    if (!formData.destinationUrl.trim()) {
      setFormError('مقصد (URL) الزامی است');
      return;
    }

    try {
      if (editingId) {
        const input: UpdateSpecialItemInput = {
          title: formData.title,
          description: formData.description || null,
          icon: formData.icon,
          imageUrl: formData.imageUrl,
          destinationUrl: formData.destinationUrl,
          displayOrder: formData.displayOrder,
          isPublished: formData.isPublished,
          isEnabled: formData.isEnabled,
        };
        await updateMutation.mutateAsync({ itemId: editingId, input });
        show('success', 'آیتم به‌روزرسانی شد');
      } else {
        const input: CreateSpecialItemInput = {
          title: formData.title,
          description: formData.description || null,
          icon: formData.icon,
          imageUrl: formData.imageUrl,
          destinationUrl: formData.destinationUrl,
          displayOrder: formData.displayOrder,
          isPublished: formData.isPublished,
          isEnabled: formData.isEnabled,
        };
        await createMutation.mutateAsync(input);
        show('success', 'آیتم جدید ایجاد شد');
      }
      setDrawerOpen(false);
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی');
    }
  };

  // ── Row action handlers ──
  const handleToggle = async (item: SpecialItem) => {
    try {
      await toggleMutation.mutateAsync({ itemId: item.id, isEnabled: !item.isEnabled });
      show('success', item.isEnabled ? 'آیتم غیرفعال شد' : 'آیتم فعال شد');
    } catch (err) {
      show('error', 'خطا در تغییر وضعیت', (err as { message?: string })?.message);
    }
  };

  const handleMove = async (item: SpecialItem, direction: 'up' | 'down') => {
    if (!items) return;
    const sorted = [...items].sort((a, b) => a.displayOrder - b.displayOrder);
    const index = sorted.findIndex((s) => s.id === item.id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const swapItem = sorted[swapIndex];

    const reordered = sorted.map((s, i) => ({ id: s.id, displayOrder: i }));
    const currentOrder = reordered.find((r) => r.id === item.id)!.displayOrder;
    const swapOrder = reordered.find((r) => r.id === swapItem.id)!.displayOrder;
    reordered.find((r) => r.id === item.id)!.displayOrder = swapOrder;
    reordered.find((r) => r.id === swapItem.id)!.displayOrder = currentOrder;

    try {
      await reorderMutation.mutateAsync(reordered);
    } catch (err) {
      show('error', 'خطا در ترتیب‌بندی', (err as { message?: string })?.message);
    }
  };

  const handleDuplicate = async (item: SpecialItem) => {
    try {
      await duplicateMutation.mutateAsync(item.id);
      show('success', 'آیتم تکثیر شد');
    } catch (err) {
      show('error', 'خطا در تکثیر', (err as { message?: string })?.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      show('success', 'آیتم حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف آیتم');
    }
  };

  // ── Image upload ──
  const handleUploadImage = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      show('error', 'فقط فایل تصویری مجاز است');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `special-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('homepage-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage
        .from('homepage-images')
        .getPublicUrl(fileName);
      setFormData((p) => ({ ...p, imageUrl: pub.publicUrl }));
      show('success', 'تصویر آپلود شد');
    } catch {
      show('error', 'خطا در آپلود تصویر');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData((p) => ({ ...p, imageUrl: null }));
  };

  // ── Preview icon ──
  const PreviewIcon = specialIconMap[formData.icon] ?? specialIconMap.sparkles;
  const isExternalDest = formData.destinationUrl.startsWith('http://') || formData.destinationUrl.startsWith('https://');

  // ── Table columns ──
  const columns: Column<SpecialItem>[] = [
    {
      key: 'displayOrder',
      header: 'ترتیب',
      width: 'w-20',
      render: (row) => (
        <div className="flex items-center gap-1">
          <span className="text-sm text-neutral-600 font-num w-6">{toPersianDigits(row.displayOrder)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleMove(row, 'up'); }}
            className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors disabled:opacity-30"
            disabled={row.displayOrder === 0}
            aria-label="انتقال به بالا"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleMove(row, 'down'); }}
            className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
            aria-label="انتقال به پایین"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
    {
      key: 'title',
      header: 'عنوان',
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-primary-50 text-primary-700">
            {(() => {
              const Icon = specialIconMap[row.icon] ?? specialIconMap.sparkles;
              return <Icon className="w-4 h-4" />;
            })()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-neutral-800 truncate">{row.title}</p>
            {row.description && (
              <p className="text-xs text-neutral-400 mt-0.5 truncate">{row.description}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'destinationUrl',
      header: 'مقصد',
      hideOnMobile: true,
      render: (row) => (
        <div className="flex items-center gap-1.5">
          {row.destinationUrl.startsWith('http') ? (
            <Globe className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          ) : (
            <Link2 className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          )}
          <span className="text-xs text-neutral-500 truncate font-mono" dir="ltr">
            {row.destinationUrl}
          </span>
        </div>
      ),
    },
    {
      key: 'isPublished',
      header: 'انتشار',
      hideOnMobile: true,
      render: (row) => (
        <StatusBadge status={row.isPublished ? 'published' : 'draft'} />
      ),
    },
    {
      key: 'isEnabled',
      header: 'فعال',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggle(row); }}
          className={cn(
            'w-9 h-5 rounded-full transition-colors relative',
            row.isEnabled ? 'bg-success-500' : 'bg-neutral-300',
          )}
          aria-label={row.isEnabled ? 'غیرفعال کردن' : 'فعال کردن'}
        >
          <span className={cn(
            'absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform',
            row.isEnabled ? 'left-0.5' : 'right-0.5',
          )} />
        </button>
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            aria-label="ویرایش"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); handleDuplicate(row); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            aria-label="تکثیر"
          >
            <Copy className="w-3.5 h-3.5" />
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
        title="مدیریت ویژه"
        description="مدیریت آیتم‌های بخش ویژه صفحه اصلی"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            آیتم جدید
          </Button>
        }
      />

      {/* ── Dashboard stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <StatCard label="کل آیتم‌ها" value={stats.total} icon={Package} tone="neutral" />
        <StatCard label="فعال" value={stats.active} icon={CheckCircle2} tone="success" />
        <StatCard label="غیرفعال" value={stats.inactive} icon={XCircle} tone="error" />
        <StatCard label="منتشر شده" value={stats.published} icon={Eye} tone="primary" />
        <StatCard label="منتشر نشده" value={stats.unpublished} icon={EyeOff} tone="warning" />
      </div>

      {/* ── Filter bar ── */}
      <div className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در آیتم‌ها..."
            className="flex-1 max-w-xs"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </FilterBar>
      </div>

      {/* ── Data table ── */}
      {isLoading ? (
        <LoadingState label="در حال بارگذاری آیتم‌ها..." />
      ) : error ? (
        <ErrorState message="خطا در بارگذاری آیتم‌ها" onRetry={() => refetch()} />
      ) : filteredItems.length === 0 ? (
        <EmptyState
          icon={<Sparkles className="w-8 h-8" />}
          title="آیتمی یافت نشد"
          description={search || statusFilter !== 'all' ? 'با فیلترهای انتخاب‌شده آیتمی وجود ندارد' : 'هنوز آیتمی برای بخش ویژه ایجاد نشده است'}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              ایجاد اولین آیتم
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredItems}
          rowKey={(row) => row.id}
        />
      )}

      {/* ── Create/Edit Drawer ── */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'ویرایش آیتم' : 'آیتم جدید'}
        side="right"
        width="max-w-md"
      >
        <div className="p-4 space-y-5">
          {/* ── Live Preview ── */}
          <div>
            <p className="text-sm font-medium text-neutral-700 mb-2">پیش‌نمایش کارت</p>
            <div className="w-36 mx-auto">
              <SpecialCard
                title={formData.title || 'عنوان نمونه'}
                description={formData.description || undefined}
                icon={formData.icon}
                imageUrl={formData.imageUrl}
                destinationUrl={formData.destinationUrl || '#'}
                preview
              />
            </div>
          </div>

          <FormSection>
            {/* ── CONTENT ── */}
            <FormField label="عنوان" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="عنوان آیتم"
              />
            </FormField>

            <FormField label="توضیح کوتاه" hint="اختیاری — زیر عنوان نمایش داده می‌شود">
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="توضیح کوتاه"
              />
            </FormField>

            {/* ── VISUAL: Icon ── */}
            <FormField label="آیکون" required hint="آیکون پیش‌فرض در صورت نبود تصویر">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary-50 text-primary-700 border border-primary-200">
                  <PreviewIcon className="w-6 h-6" />
                </div>
                <select
                  value={formData.icon}
                  onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                  className="flex-1 h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  {specialIconOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </FormField>

            {/* ── VISUAL: Optional image ── */}
            <FormField label="تصویر (اختیاری)" hint="در صورت آپلود، به جای آیکون نمایش داده می‌شود">
              <div className="space-y-2">
                {formData.imageUrl ? (
                  <div className="relative rounded-lg overflow-hidden border border-neutral-200">
                    <img src={formData.imageUrl} alt="پیش‌نمایش" className="w-full h-28 object-cover" />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-2 left-2 w-7 h-7 rounded-lg bg-white/90 flex items-center justify-center text-error-600 hover:bg-white transition-colors"
                      aria-label="حذف تصویر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-28 rounded-lg border-2 border-dashed border-neutral-200 flex flex-col items-center justify-center gap-1 text-neutral-400">
                    <ImageIcon className="w-7 h-7" />
                    <span className="text-xs">بدون تصویر</span>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleUploadImage(file);
                    e.target.value = '';
                  }}
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? 'در حال آپلود...' : 'آپلود تصویر'}
                </Button>
              </div>
            </FormField>

            {/* ── NAVIGATION ── */}
            <FormField label="مقصد (URL)" required hint={isExternalDest ? 'لینک خارجی — در تب جدید باز می‌شود' : 'مسیر داخلی (مثل /excitement)'}>
              <Input
                value={formData.destinationUrl}
                onChange={(e) => setFormData({ ...formData, destinationUrl: e.target.value })}
                placeholder="/excitement یا https://..."
                dir="ltr"
              />
            </FormField>

            {/* ── PUBLISHING ── */}
            <FormRow>
              <FormField label="وضعیت انتشار">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isPublished}
                    onChange={(e) => setFormData({ ...formData, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">منتشر شده</span>
                </label>
              </FormField>

              <FormField label="فعال‌سازی">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isEnabled}
                    onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">فعال</span>
                </label>
              </FormField>
            </FormRow>

            {/* ── ORDER ── */}
            <FormField label="ترتیب نمایش" hint="عدد کمتر = نمایش زودتر">
              <Input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </FormSection>

          {formError && (
            <div className="px-3 py-2 rounded-lg bg-error-50 border border-error-200 text-sm text-error-700">
              {formError}
            </div>
          )}

          <FormActions>
            <Button
              size="sm"
              onClick={handleSubmit}
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'ذخیره تغییرات' : 'ایجاد آیتم'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              انصراف
            </Button>
          </FormActions>
        </div>
      </Drawer>

      {/* ── Delete Confirmation ── */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="حذف آیتم"
        message={`آیا از حذف آیتم «${deleteTarget?.title ?? ''}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
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
