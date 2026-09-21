import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2 } from 'lucide-react';
import {
  useAdminBusinessCategories,
  useCreateBusinessCategory,
  useUpdateBusinessCategory,
  useDeleteBusinessCategory,
  useReorderBusinessCategories,
} from '@/hooks/useAdminBusiness';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
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
import type { BusinessCategoryWithActive } from '@/types';

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  iconName: string;
  displayOrder: number;
  isActive: boolean;
}

const defaultFormData: CategoryFormData = {
  name: '',
  slug: '',
  description: '',
  iconName: '',
  displayOrder: 0,
  isActive: true,
};

export function AdminBusinessCategoryPage() {
  const location = useLocation();
  const { show } = useToast();

  const { data: categories, isLoading, error, refetch } = useAdminBusinessCategories();
  const createMutation = useCreateBusinessCategory();
  const updateMutation = useUpdateBusinessCategory();
  const deleteMutation = useDeleteBusinessCategory();
  const reorderMutation = useReorderBusinessCategories();

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessCategoryWithActive | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'دسته‌بندی کسب‌وکارها');

  const sortedCategories = useMemo(() => {
    if (!categories) return [];
    return [...categories].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  }, [categories]);

  const filteredCategories = useMemo(() => {
    if (!search) return sortedCategories;
    return sortedCategories.filter(
      (c) =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.slug.toLowerCase().includes(search.toLowerCase()),
    );
  }, [sortedCategories, search]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData, displayOrder: categories?.length ?? 0 });
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (cat: BusinessCategoryWithActive) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description ?? '',
      iconName: cat.iconName ?? '',
      displayOrder: cat.displayOrder,
      isActive: cat.isActive,
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('نام دسته‌بندی الزامی است');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('نامک الزامی است');
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({
          categoryId: editingId,
          input: {
            name: formData.name,
            slug: formData.slug,
            description: formData.description || null,
            iconName: formData.iconName || null,
            displayOrder: formData.displayOrder,
            isActive: formData.isActive,
          },
        });
        show('success', 'دسته‌بندی به‌روزرسانی شد');
      } else {
        await createMutation.mutateAsync({
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          iconName: formData.iconName || null,
          displayOrder: formData.displayOrder,
          isActive: formData.isActive,
        });
        show('success', 'دسته‌بندی ایجاد شد');
      }
      setDrawerOpen(false);
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی');
    }
  };

  const handleMove = async (cat: BusinessCategoryWithActive, direction: 'up' | 'down') => {
    const sorted = sortedCategories;
    const index = sorted.findIndex((c) => c.id === cat.id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const swapCat = sorted[swapIndex];

    const reordered = sorted.map((c, i) => ({ id: c.id, display_order: i }));
    const currentOrder = reordered.find((r) => r.id === cat.id)!.display_order;
    const swapOrder = reordered.find((r) => r.id === swapCat.id)!.display_order;
    reordered.find((r) => r.id === cat.id)!.display_order = swapOrder;
    reordered.find((r) => r.id === swapCat.id)!.display_order = currentOrder;

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
      show('success', 'دسته‌بندی حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف دسته‌بندی');
    }
  };

  return (
    <div>
      <AdminPageHeader
        title="دسته‌بندی کسب‌وکارها"
        description="مدیریت دسته‌بندی‌های کسب‌وکارهای محلی"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            دسته‌بندی جدید
          </Button>
        }
      />

      <div className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در دسته‌بندی‌ها..."
            className="flex-1 max-w-xs"
          />
        </FilterBar>
      </div>

      {isLoading ? (
        <LoadingState label="در حال بارگذاری دسته‌بندی‌ها..." />
      ) : error ? (
        <ErrorState message="خطا در بارگذاری دسته‌بندی‌ها" onRetry={() => refetch()} />
      ) : filteredCategories.length === 0 ? (
        <EmptyState
          icon={<Plus className="w-8 h-8" />}
          title="دسته‌بندی‌ای یافت نشد"
          description={search ? 'با فیلتر انتخاب‌شده دسته‌بندی وجود ندارد' : 'هنوز دسته‌بندی ایجاد نشده است'}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              ایجاد اولین دسته‌بندی
            </Button>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-neutral-200">
          <table className="w-full">
            <thead className="bg-neutral-50 border-b border-neutral-200">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">ترتیب</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase">نام</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">نامک</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">آیکن</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">وضعیت</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="text-sm text-neutral-600 font-num w-6">{toPersianDigits(cat.displayOrder)}</span>
                      <button
                        onClick={() => handleMove(cat, 'up')}
                        className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        aria-label="انتقال به بالا"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMove(cat, 'down')}
                        className="w-6 h-6 flex items-center justify-center rounded text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-colors"
                        aria-label="انتقال به پایین"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-neutral-800">{cat.name}</p>
                      {cat.description && (
                        <p className="text-xs text-neutral-400 mt-0.5">{cat.description}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="text-sm text-neutral-500 font-mono">{cat.slug}</span>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    {cat.iconName ? (
                      <span className="text-sm text-neutral-600 font-mono">{cat.iconName}</span>
                    ) : (
                      <span className="text-xs text-neutral-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        cat.isActive
                          ? 'bg-green-50 text-green-700'
                          : 'bg-neutral-100 text-neutral-500'
                      }`}
                    >
                      {cat.isActive ? 'فعال' : 'غیرفعال'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => openEdit(cat)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-primary-600 hover:bg-primary-50 transition-colors"
                        aria-label="ویرایش"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(cat);
                          setDeleteError(null);
                        }}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                        aria-label="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}
      >
        <FormSection>
          <FormField label="نام دسته‌بندی" required>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="مثال: رستوران و کافه"
            />
          </FormField>

          <FormField label="نامک (slug)" required hint="نام انگلیسی بدون فاصله، برای آدرس صفحه">
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="restaurant-cafe"
              dir="ltr"
            />
          </FormField>

          <FormField label="توضیحات">
            <Input
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="توضیح کوتاه دسته‌بندی"
            />
          </FormField>

          <FormField label="نام آیکن" hint="نام آیکن از کتابخانه Lucide">
            <Input
              value={formData.iconName}
              onChange={(e) => setFormData({ ...formData, iconName: e.target.value })}
              placeholder="UtensilsCrossed"
              dir="ltr"
            />
          </FormField>

          <FormRow>
            <FormField label="ترتیب نمایش">
              <Input
                type="number"
                value={formData.displayOrder}
                onChange={(e) => setFormData({ ...formData, displayOrder: parseInt(e.target.value) || 0 })}
              />
            </FormField>
            <FormField label="وضعیت">
              <label className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">فعال</span>
              </label>
            </FormField>
          </FormRow>

          {formError && (
            <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</div>
          )}

          <FormActions>
            <Button variant="outline" onClick={() => setDrawerOpen(false)}>
              انصراف
            </Button>
            <Button
              onClick={handleSubmit}
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
            </Button>
          </FormActions>
        </FormSection>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        title="حذف دسته‌بندی"
        message={`آیا از حذف «${deleteTarget?.name}» مطمئن هستید؟`}
        confirmLabel="حذف"
        cancelLabel="انصراف"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
        error={deleteError}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
