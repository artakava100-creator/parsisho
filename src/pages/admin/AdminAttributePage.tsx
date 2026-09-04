import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, Power, Layers } from 'lucide-react';
import {
  useAdminAttributeDefinitions,
  useCreateAttributeDefinition,
  useUpdateAttributeDefinition,
  useDeleteAttributeDefinition,
  useReorderAttributeDefinitions,
} from '@/hooks/useAdminAttribute';
import { useAdminCategories } from '@/hooks/useAdminCategory';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { SearchInput, FilterBar } from '@/components/admin/FilterBar';
import { LoadingState, ErrorState } from '@/components/admin/LoadingErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/admin/Drawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { FormSection, FormField, FormRow, FormActions } from '@/components/admin/FormControls';
import { useToast } from '@/providers/useToast';
import { toPersianDigits } from '@/lib/persian';
import type {
  ProductAttributeDefinition,
  AttributeType,
  CreateAttributeDefinitionInput,
  UpdateAttributeDefinitionInput,
} from '@/types';

const ATTRIBUTE_TYPE_LABELS: Record<AttributeType, string> = {
  text: 'متن',
  number: 'عدد',
  boolean: 'بله/خیر',
  select: 'انتخاب تکی',
  multi_select: 'انتخاب چندگانه',
};

interface AttrFormData {
  name: string;
  slug: string;
  attributeType: AttributeType;
  categoryId: string;
  options: string;
  isFilterable: boolean;
  isRequired: boolean;
  isActive: boolean;
  sortOrder: number;
}

const defaultFormData: AttrFormData = {
  name: '',
  slug: '',
  attributeType: 'text',
  categoryId: '',
  options: '',
  isFilterable: false,
  isRequired: false,
  isActive: true,
  sortOrder: 0,
};

export function AdminAttributePage() {
  const location = useLocation();
  const { show } = useToast();

  const { data: definitions, isLoading, error, refetch } = useAdminAttributeDefinitions();
  const { data: categories } = useAdminCategories();
  const createMutation = useCreateAttributeDefinition();
  const updateMutation = useUpdateAttributeDefinition();
  const deleteMutation = useDeleteAttributeDefinition();
  const reorderMutation = useReorderAttributeDefinitions();

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<AttrFormData>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductAttributeDefinition | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'ویژگی‌ها و تنوع‌ها');

  const filteredDefinitions = useMemo(() => {
    if (!definitions) return [];
    if (!search) return definitions;
    return definitions.filter((d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) ||
      d.slug.toLowerCase().includes(search.toLowerCase())
    );
  }, [definitions, search]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData, sortOrder: definitions?.length ?? 0 });
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (def: ProductAttributeDefinition) => {
    setEditingId(def.id);
    setFormData({
      name: def.name,
      slug: def.slug,
      attributeType: def.attributeType,
      categoryId: def.categoryId ?? '',
      options: def.options ? JSON.stringify(def.options) : '',
      isFilterable: def.isFilterable,
      isRequired: def.isRequired,
      isActive: def.isActive,
      sortOrder: def.sortOrder,
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('نام ویژگی الزامی است');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('نامک الزامی است');
      return;
    }

    let parsedOptions: Record<string, unknown> | null = null;
    if (formData.options.trim()) {
      try {
        parsedOptions = JSON.parse(formData.options);
      } catch {
        setFormError('فرمت گزینه‌ها نامعتبر است (باید JSON معتبر باشد)');
        return;
      }
    }

    try {
      if (editingId) {
        const input: UpdateAttributeDefinitionInput = {
          name: formData.name,
          slug: formData.slug,
          attributeType: formData.attributeType,
          categoryId: formData.categoryId || null,
          options: parsedOptions,
          isFilterable: formData.isFilterable,
          isRequired: formData.isRequired,
          isActive: formData.isActive,
          sortOrder: formData.sortOrder,
        };
        await updateMutation.mutateAsync({ definitionId: editingId, input });
        show('success', 'ویژگی به‌روزرسانی شد');
      } else {
        const input: CreateAttributeDefinitionInput = {
          name: formData.name,
          slug: formData.slug,
          attributeType: formData.attributeType,
          categoryId: formData.categoryId || null,
          options: parsedOptions,
          isFilterable: formData.isFilterable,
          isRequired: formData.isRequired,
          sortOrder: formData.sortOrder,
        };
        await createMutation.mutateAsync(input);
        show('success', 'ویژگی ایجاد شد');
      }
      setDrawerOpen(false);
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی');
    }
  };

  const handleToggleActive = async (def: ProductAttributeDefinition) => {
    try {
      await updateMutation.mutateAsync({
        definitionId: def.id,
        input: { isActive: !def.isActive },
      });
      show('success', def.isActive ? 'ویژگی غیرفعال شد' : 'ویژگی فعال شد');
    } catch (err) {
      show('error', 'خطا در تغییر وضعیت', (err as { message?: string })?.message);
    }
  };

  const handleMove = async (def: ProductAttributeDefinition, direction: 'up' | 'down') => {
    if (!definitions) return;
    const sorted = [...definitions].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((d) => d.id === def.id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const swapDef = sorted[swapIndex];

    const reordered = sorted.map((d, i) => ({ id: d.id, displayOrder: i }));
    const currentOrder = reordered.find((r) => r.id === def.id)!.displayOrder;
    const swapOrder = reordered.find((r) => r.id === swapDef.id)!.displayOrder;
    reordered.find((r) => r.id === def.id)!.displayOrder = swapOrder;
    reordered.find((r) => r.id === swapDef.id)!.displayOrder = currentOrder;

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
      show('success', 'ویژگی حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف ویژگی');
    }
  };

  const columns: Column<ProductAttributeDefinition>[] = [
    {
      key: 'sortOrder',
      header: 'ترتیب',
      width: 'w-20',
      render: (row) => (
        <div className="flex items-center gap-1">
          <span className="text-sm text-neutral-600 font-num w-6">{toPersianDigits(row.sortOrder)}</span>
          <button
            onClick={(e) => { e.stopPropagation(); handleMove(row, 'up'); }}
            className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
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
      key: 'name',
      header: 'نام ویژگی',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-neutral-800">{row.name}</p>
          <p className="text-xs text-neutral-400 mt-0.5">{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'attributeType',
      header: 'نوع',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-600">{ATTRIBUTE_TYPE_LABELS[row.attributeType] ?? row.attributeType}</span>
      ),
    },
    {
      key: 'categoryName',
      header: 'دسته‌بندی',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-500">{row.categoryName ?? 'سراسری'}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'وضعیت',
      render: (row) => <StatusBadge status={row.isActive ? 'active' : 'inactive'} />,
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); handleToggleActive(row); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-warning-600 hover:bg-warning-50 transition-colors"
            aria-label={row.isActive ? 'غیرفعال کردن' : 'فعال کردن'}
          >
            <Power className="w-3.5 h-3.5" />
          </button>
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
        title="ویژگی‌ها و تنوع‌ها"
        description="مدیریت ویژگی‌های محصولات و تنوع‌های قابل انتخاب"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            ویژگی جدید
          </Button>
        }
      />

      <div className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در ویژگی‌ها..."
            className="flex-1 max-w-xs"
          />
        </FilterBar>
      </div>

      {isLoading ? (
        <LoadingState label="در حال بارگذاری ویژگی‌ها..." />
      ) : error ? (
        <ErrorState message="خطا در بارگذاری ویژگی‌ها" onRetry={() => refetch()} />
      ) : filteredDefinitions.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-8 h-8" />}
          title="ویژگی‌ای یافت نشد"
          description={search ? 'با فیلتر انتخاب‌شده ویژگی وجود ندارد' : 'هنوز ویژگی ایجاد نشده است'}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              ایجاد اولین ویژگی
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredDefinitions}
          rowKey={(row) => row.id}
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'ویرایش ویژگی' : 'ویژگی جدید'}
        side="right"
        width="max-w-md"
      >
        <div className="p-4 space-y-5">
          <FormSection>
            <FormField label="نام ویژگی" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="مثال: رنگ"
              />
            </FormField>

            <FormField label="نامک (slug)" required>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="color"
              />
            </FormField>

            <FormRow>
              <FormField label="نوع ویژگی" required>
                <select
                  value={formData.attributeType}
                  onChange={(e) => setFormData({ ...formData, attributeType: e.target.value as AttributeType })}
                  className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  {Object.entries(ATTRIBUTE_TYPE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </FormField>

              <FormField label="دسته‌بندی" hint="خالی = سراسری">
                <select
                  value={formData.categoryId}
                  onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                  className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                >
                  <option value="">سراسری</option>
                  {(categories ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
            </FormRow>

            <FormField label="گزینه‌ها (JSON)" hint='برای نوع انتخاب: ["قرمز","آبی","سبز"]'>
              <textarea
                value={formData.options}
                onChange={(e) => setFormData({ ...formData, options: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 font-mono focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
                placeholder='["قرمز","آبی","سبز"]'
              />
            </FormField>

            <FormField label="ترتیب نمایش">
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </FormField>

            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isFilterable}
                  onChange={(e) => setFormData({ ...formData, isFilterable: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">قابل فیلتر</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isRequired}
                  onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">اجباری</span>
              </label>
              {editingId && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                  />
                  <span className="text-sm text-neutral-700">فعال</span>
                </label>
              )}
            </div>
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
              {editingId ? 'ذخیره تغییرات' : 'ایجاد ویژگی'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDrawerOpen(false)}>
              انصراف
            </Button>
          </FormActions>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="حذف ویژگی"
        message={`آیا از حذف ویژگی «${deleteTarget?.name ?? ''}» مطمئن هستید؟`}
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
