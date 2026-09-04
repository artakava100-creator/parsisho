import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, Power, Eye, EyeOff } from 'lucide-react';
import { useAdminStorefrontSections, useCreateStorefrontSection, useUpdateStorefrontSection, useDeleteStorefrontSection, useReorderStorefrontSections, useToggleStorefrontSection } from '@/hooks/useAdminStorefront';
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
import { useToast } from '@/providers/useToast';
import { toPersianDigits } from '@/lib/persian';
import type { StorefrontSection, StorefrontSectionType, StorefrontSectionStatus, StorefrontVisibility, CreateStorefrontSectionInput, UpdateStorefrontSectionInput } from '@/types';

const SECTION_TYPE_LABELS: Record<StorefrontSectionType, string> = {
  hero: 'هیرو',
  auction_spotlight: 'مزایده ویژه',
  product_collection: 'مجموعه محصولات',
  category_grid: 'شبکه دسته‌بندی',
  campaign_banner: 'بنر کمپین',
  custom_html: 'HTML سفارشی',
  slideshow: 'اسلایدشو',
  trust_badges: 'نشان‌های اعتماد',
  navigation_cards: 'کارت‌های ناوبری',
};

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'all', label: 'همه وضعیت‌ها' },
  { value: 'active', label: 'فعال' },
  { value: 'draft', label: 'پیش‌نویس' },
  { value: 'archived', label: 'بایگانی' },
];

const VISIBILITY_LABELS: Record<StorefrontVisibility, string> = {
  all: 'همه',
  logged_in: 'کاربران وارد شده',
  logged_out: 'کاربران مهمان',
};

interface FormData {
  sectionKey: string;
  title: string;
  subtitle: string;
  sectionType: StorefrontSectionType;
  isEnabled: boolean;
  status: StorefrontSectionStatus;
  displayOrder: number;
  visibility: StorefrontVisibility;
}

const defaultFormData: FormData = {
  sectionKey: '',
  title: '',
  subtitle: '',
  sectionType: 'hero',
  isEnabled: true,
  status: 'active',
  displayOrder: 0,
  visibility: 'all',
};

export function AdminStorefrontPage() {
  const location = useLocation();
  const { show } = useToast();
  const { data: sections, isLoading, error, refetch } = useAdminStorefrontSections();
  const createMutation = useCreateStorefrontSection();
  const updateMutation = useUpdateStorefrontSection();
  const deleteMutation = useDeleteStorefrontSection();
  const reorderMutation = useReorderStorefrontSections();
  const toggleMutation = useToggleStorefrontSection();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorefrontSection | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'ویترین فروشگاه');

  const filteredSections = useMemo(() => {
    if (!sections) return [];
    return sections.filter((s) => {
      const matchesSearch = !search ||
        s.title.toLowerCase().includes(search.toLowerCase()) ||
        s.sectionKey.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [sections, search, statusFilter]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData, displayOrder: sections?.length ?? 0 });
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (section: StorefrontSection) => {
    setEditingId(section.id);
    setFormData({
      sectionKey: section.sectionKey,
      title: section.title,
      subtitle: section.subtitle ?? '',
      sectionType: section.sectionType,
      isEnabled: section.isEnabled,
      status: section.status,
      displayOrder: section.displayOrder,
      visibility: section.visibility,
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.sectionKey.trim() || formData.sectionKey.trim().length < 2) {
      setFormError('کلید بخش حداقل ۲ نویسه باید باشد');
      return;
    }
    if (!formData.title.trim() || formData.title.trim().length < 2) {
      setFormError('عنوان بخش الزامی است');
      return;
    }

    try {
      if (editingId) {
        const input: UpdateStorefrontSectionInput = {
          title: formData.title,
          subtitle: formData.subtitle || null,
          sectionType: formData.sectionType,
          isEnabled: formData.isEnabled,
          status: formData.status,
          displayOrder: formData.displayOrder,
          visibility: formData.visibility,
        };
        await updateMutation.mutateAsync({ sectionId: editingId, input });
        show('success', 'بخش به‌روزرسانی شد');
      } else {
        const input: CreateStorefrontSectionInput = {
          sectionKey: formData.sectionKey,
          title: formData.title,
          subtitle: formData.subtitle || null,
          sectionType: formData.sectionType,
          isEnabled: formData.isEnabled,
          status: formData.status,
          displayOrder: formData.displayOrder,
          visibility: formData.visibility,
        };
        await createMutation.mutateAsync(input);
        show('success', 'بخش جدید ایجاد شد');
      }
      setDrawerOpen(false);
    } catch (err) {
      const message = (err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی';
      setFormError(message);
    }
  };

  const handleToggle = async (section: StorefrontSection) => {
    try {
      await toggleMutation.mutateAsync({ sectionId: section.id, isEnabled: !section.isEnabled });
      show('success', section.isEnabled ? 'بخش غیرفعال شد' : 'بخش فعال شد');
    } catch (err) {
      show('error', 'خطا در تغییر وضعیت', (err as { message?: string })?.message);
    }
  };

  const handleMove = async (section: StorefrontSection, direction: 'up' | 'down') => {
    if (!sections) return;
    const sorted = [...sections].sort((a, b) => a.displayOrder - b.displayOrder);
    const index = sorted.findIndex((s) => s.id === section.id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const swapSection = sorted[swapIndex];

    const reordered = sorted.map((s, i) => ({ id: s.id, displayOrder: i }));
    const currentOrder = reordered.find((r) => r.id === section.id)!.displayOrder;
    const swapOrder = reordered.find((r) => r.id === swapSection.id)!.displayOrder;
    reordered.find((r) => r.id === section.id)!.displayOrder = swapOrder;
    reordered.find((r) => r.id === swapSection.id)!.displayOrder = currentOrder;

    try {
      await reorderMutation.mutateAsync(reordered);
    } catch (err) {
      show('error', 'خطا در ترتیب‌بندی', (err as { message?: string })?.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      show('success', 'بخش حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف بخش');
    }
  };

  const columns: Column<StorefrontSection>[] = [
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
        <div>
          <p className="text-sm font-medium text-neutral-800">{row.title}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{row.sectionKey}</p>
        </div>
      ),
    },
    {
      key: 'sectionType',
      header: 'نوع',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-600">{SECTION_TYPE_LABELS[row.sectionType] ?? row.sectionType}</span>
      ),
    },
    {
      key: 'visibility',
      header: 'نمایش',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-500">{VISIBILITY_LABELS[row.visibility]}</span>
      ),
    },
    {
      key: 'status',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.status} />,
    },
    {
      key: 'isEnabled',
      header: 'فعال',
      render: (row) => (
        <button
          onClick={(e) => { e.stopPropagation(); handleToggle(row); }}
          className={`w-9 h-5 rounded-full transition-colors relative ${row.isEnabled ? 'bg-success-500' : 'bg-neutral-300'}`}
          aria-label={row.isEnabled ? 'غیرفعال کردن' : 'فعال کردن'}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${row.isEnabled ? 'left-0.5' : 'right-0.5'}`} />
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
        title="ویترین فروشگاه"
        description="مدیریت بخش‌های ساختاری ویترین بازار"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            بخش جدید
          </Button>
        }
      />

      <div className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در بخش‌ها..."
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

      {isLoading ? (
        <LoadingState label="در حال بارگذاری بخش‌ها..." />
      ) : error ? (
        <ErrorState message="خطا در بارگذاری بخش‌ها" onRetry={() => refetch()} />
      ) : filteredSections.length === 0 ? (
        <EmptyState
          icon={<Eye className="w-8 h-8" />}
          title="بخشی یافت نشد"
          description={search || statusFilter !== 'all' ? 'با فیلترهای انتخاب‌شده بخشی وجود ندارد' : 'هنوز بخشی برای ویترین ایجاد نشده است'}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              ایجاد اولین بخش
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredSections}
          rowKey={(row) => row.id}
        />
      )}

      {/* Create/Edit Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'ویرایش بخش' : 'بخش جدید'}
        side="right"
        width="max-w-md"
      >
        <div className="p-4 space-y-5">
          <FormSection>
            <FormField label="کلید بخش" required hint="شناسه یکتا و انگلیسی بخش (مثال: hero)">
              <Input
                value={formData.sectionKey}
                onChange={(e) => setFormData({ ...formData, sectionKey: e.target.value })}
                disabled={!!editingId}
                placeholder="hero"
              />
            </FormField>

            <FormField label="عنوان" required>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="عنوان بخش"
              />
            </FormField>

            <FormField label="زیرعنوان" hint="توضیح کوتاه بخش (اختیاری)">
              <Input
                value={formData.subtitle}
                onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
                placeholder="زیرعنوان"
              />
            </FormField>

            <FormRow>
              <FormField label="نوع بخش" required>
                <select
                  value={formData.sectionType}
                  onChange={(e) => setFormData({ ...formData, sectionType: e.target.value as StorefrontSectionType })}
                  className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  {Object.entries(SECTION_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="وضعیت">
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as StorefrontSectionStatus })}
                  className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="active">فعال</option>
                  <option value="draft">پیش‌نویس</option>
                  <option value="archived">بایگانی</option>
                </select>
              </FormField>
            </FormRow>

            <FormRow>
              <FormField label="نمایش">
                <select
                  value={formData.visibility}
                  onChange={(e) => setFormData({ ...formData, visibility: e.target.value as StorefrontVisibility })}
                  className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="all">همه</option>
                  <option value="logged_in">کاربران وارد شده</option>
                  <option value="logged_out">کاربران مهمان</option>
                </select>
              </FormField>

              <FormField label="ترتیب نمایش" hint="عدد کمتر = نمایش زودتر">
                <Input
                  type="number"
                  value={formData.displayOrder}
                  onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
                />
              </FormField>
            </FormRow>

            <FormField label="فعال‌سازی بخش">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isEnabled}
                  onChange={(e) => setFormData({ ...formData, isEnabled: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">این بخش در ویترین نمایش داده شود</span>
              </label>
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
              {editingId ? 'ذخیره تغییرات' : 'ایجاد بخش'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              انصراف
            </Button>
          </FormActions>
        </div>
      </Drawer>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="حذف بخش"
        message={`آیا از حذف بخش «${deleteTarget?.title ?? ''}» مطمئن هستید؟ این عملیات قابل بازگشت نیست.`}
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
