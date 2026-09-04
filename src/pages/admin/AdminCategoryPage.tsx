import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, ChevronLeft } from 'lucide-react';
import {
  useAdminCategories,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useReorderCategories,
} from '@/hooks/useAdminCategory';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
import { StatusBadge } from '@/components/admin/StatusBadge';
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
import type { ProductCategory, CreateCategoryInput, UpdateCategoryInput } from '@/types';

interface CategoryFormData {
  name: string;
  slug: string;
  parentId: string;
  shortDescription: string;
  description: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
  showOnHome: boolean;
  showInNavigation: boolean;
}

const defaultFormData: CategoryFormData = {
  name: '',
  slug: '',
  parentId: '',
  shortDescription: '',
  description: '',
  icon: '',
  sortOrder: 0,
  isActive: true,
  showOnHome: true,
  showInNavigation: true,
};

export function AdminCategoryPage() {
  const location = useLocation();
  const { show } = useToast();

  const { data: categories, isLoading, error, refetch } = useAdminCategories();
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();
  const reorderMutation = useReorderCategories();

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductCategory | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'دسته‌بندی‌ها');

  const buildTree = (cats: ProductCategory[]): ProductCategory[] => {
    const sorted = [...cats].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return sorted;
  };

  const filteredCategories = useMemo(() => {
    if (!categories) return [];
    const tree = buildTree(categories);
    if (!search) return tree;
    return tree.filter((c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.slug.toLowerCase().includes(search.toLowerCase())
    );
  }, [categories, search]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData, sortOrder: categories?.length ?? 0 });
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (cat: ProductCategory) => {
    setEditingId(cat.id);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      parentId: cat.parentId ?? '',
      shortDescription: cat.shortDescription ?? '',
      description: cat.description ?? '',
      icon: cat.icon ?? '',
      sortOrder: cat.sortOrder,
      isActive: cat.isActive,
      showOnHome: cat.showOnHome,
      showInNavigation: cat.showInNavigation,
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
        const input: UpdateCategoryInput = {
          name: formData.name,
          slug: formData.slug,
          parentId: formData.parentId || null,
          shortDescription: formData.shortDescription || null,
          description: formData.description || null,
          icon: formData.icon || null,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          showOnHome: formData.showOnHome,
          showInNavigation: formData.showInNavigation,
        };
        await updateMutation.mutateAsync({ categoryId: editingId, input });
        show('success', 'دسته‌بندی به‌روزرسانی شد');
      } else {
        const input: CreateCategoryInput = {
          name: formData.name,
          slug: formData.slug,
          parentId: formData.parentId || null,
          shortDescription: formData.shortDescription || null,
          description: formData.description || null,
          icon: formData.icon || null,
          sortOrder: formData.sortOrder,
          isActive: formData.isActive,
          showOnHome: formData.showOnHome,
          showInNavigation: formData.showInNavigation,
        };
        await createMutation.mutateAsync(input);
        show('success', 'دسته‌بندی ایجاد شد');
      }
      setDrawerOpen(false);
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی');
    }
  };

  const handleMove = async (cat: ProductCategory, direction: 'up' | 'down') => {
    if (!categories) return;
    const sorted = buildTree(categories);
    const index = sorted.findIndex((c) => c.id === cat.id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const swapCat = sorted[swapIndex];

    const reordered = sorted.map((c, i) => ({ id: c.id, displayOrder: i }));
    const currentOrder = reordered.find((r) => r.id === cat.id)!.displayOrder;
    const swapOrder = reordered.find((r) => r.id === swapCat.id)!.displayOrder;
    reordered.find((r) => r.id === cat.id)!.displayOrder = swapOrder;
    reordered.find((r) => r.id === swapCat.id)!.displayOrder = currentOrder;

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

  const getDepth = (cat: ProductCategory, all: ProductCategory[]): number => {
    let depth = 0;
    let current = cat;
    while (current.parentId) {
      const parent = all.find((c) => c.id === current.parentId);
      if (!parent) break;
      depth++;
      current = parent;
    }
    return depth;
  };

  return (
    <div>
      <AdminPageHeader
        title="دسته‌بندی‌ها"
        description="مدیریت درخت دسته‌بندی محصولات"
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
                <th className="px-4 py-3 text-right text-xs font-medium text-neutral-500 uppercase hidden md:table-cell">وضعیت</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-neutral-500 uppercase">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {filteredCategories.map((cat) => {
                const depth = getDepth(cat, categories!);
                return (
                  <tr key={cat.id} className="hover:bg-neutral-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <span className="text-sm text-neutral-600 font-num w-6">{toPersianDigits(cat.sortOrder)}</span>
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
                      <div className="flex items-center gap-1" style={{ paddingRight: `${depth * 20}px` }}>
                        {depth > 0 && <ChevronLeft className="w-3 h-3 text-neutral-300" />}
                        <div>
                          <p className="text-sm font-medium text-neutral-800">{cat.name}</p>
                          {cat.shortDescription && (
                            <p className="text-xs text-neutral-400 mt-0.5">{cat.shortDescription}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className="text-sm text-neutral-500 font-mono">{cat.slug}</span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <StatusBadge status={cat.isActive ? 'active' : 'inactive'} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(cat)}
                          className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
                          aria-label="ویرایش"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => { setDeleteTarget(cat); setDeleteError(null); }}
                          className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors"
                          aria-label="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'ویرایش دسته‌بندی' : 'دسته‌بندی جدید'}
        side="right"
        width="max-w-md"
      >
        <div className="p-4 space-y-5">
          <FormSection>
            <FormField label="نام" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="نام دسته‌بندی"
              />
            </FormField>

            <FormField label="نامک (slug)" required>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="category-slug"
              />
            </FormField>

            <FormField label="دسته‌بندی والد" hint="برای زیردسته، والد را انتخاب کنید">
              <select
                value={formData.parentId}
                onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              >
                <option value="">بدون والد (دسته اصلی)</option>
                {(categories ?? [])
                  .filter((c) => c.id !== editingId)
                  .map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
              </select>
            </FormField>

            <FormField label="توضیح کوتاه">
              <Input
                value={formData.shortDescription}
                onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
                placeholder="توضیح مختصر"
              />
            </FormField>

            <FormField label="توضیحات">
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </FormField>

            <FormField label="آیکون" hint="نام آیکون Lucide (اختیاری)">
              <Input
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="Smartphone"
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
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">فعال</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showOnHome}
                  onChange={(e) => setFormData({ ...formData, showOnHome: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">نمایش در صفحه اصلی</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.showInNavigation}
                  onChange={(e) => setFormData({ ...formData, showInNavigation: e.target.checked })}
                  className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-neutral-700">نمایش در ناوبری</span>
              </label>
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
              {editingId ? 'ذخیره تغییرات' : 'ایجاد دسته‌بندی'}
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
        title="حذف دسته‌بندی"
        message={`آیا از حذف دسته‌بندی «${deleteTarget?.name ?? ''}» مطمئن هستید؟`}
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
