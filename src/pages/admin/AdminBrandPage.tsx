import { useState, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, ArrowUp, ArrowDown, Pencil, Trash2, Tag } from 'lucide-react';
import {
  useAdminBrands,
  useCreateBrand,
  useUpdateBrand,
  useDeleteBrand,
  useReorderBrands,
} from '@/hooks/useAdminBrand';
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
import { FormSection, FormField, FormActions } from '@/components/admin/FormControls';
import { useToast } from '@/providers/useToast';
import { toPersianDigits } from '@/lib/persian';
import type { ProductBrand, CreateBrandInput, UpdateBrandInput } from '@/types';

interface BrandFormData {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
  isActive: boolean;
}

const defaultFormData: BrandFormData = {
  name: '',
  slug: '',
  description: '',
  sortOrder: 0,
  isActive: true,
};

export function AdminBrandPage() {
  const location = useLocation();
  const { show } = useToast();

  const { data: brands, isLoading, error, refetch } = useAdminBrands();
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const deleteMutation = useDeleteBrand();
  const reorderMutation = useReorderBrands();

  const [search, setSearch] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<BrandFormData>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductBrand | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const breadcrumbs = buildBreadcrumbs(location.pathname, 'برندها');

  const filteredBrands = useMemo(() => {
    if (!brands) return [];
    if (!search) return brands;
    return brands.filter((b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.slug.toLowerCase().includes(search.toLowerCase())
    );
  }, [brands, search]);

  const openCreate = () => {
    setEditingId(null);
    setFormData({ ...defaultFormData, sortOrder: brands?.length ?? 0 });
    setFormError(null);
    setDrawerOpen(true);
  };

  const openEdit = (brand: ProductBrand) => {
    setEditingId(brand.id);
    setFormData({
      name: brand.name,
      slug: brand.slug,
      description: brand.description ?? '',
      sortOrder: brand.sortOrder,
      isActive: brand.isActive,
    });
    setFormError(null);
    setDrawerOpen(true);
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('نام برند الزامی است');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('نامک الزامی است');
      return;
    }

    try {
      if (editingId) {
        const input: UpdateBrandInput = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          isActive: formData.isActive,
          sortOrder: formData.sortOrder,
        };
        await updateMutation.mutateAsync({ brandId: editingId, input });
        show('success', 'برند به‌روزرسانی شد');
      } else {
        const input: CreateBrandInput = {
          name: formData.name,
          slug: formData.slug,
          description: formData.description || null,
          sortOrder: formData.sortOrder,
        };
        await createMutation.mutateAsync(input);
        show('success', 'برند ایجاد شد');
      }
      setDrawerOpen(false);
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی');
    }
  };

  const handleMove = async (brand: ProductBrand, direction: 'up' | 'down') => {
    if (!brands) return;
    const sorted = [...brands].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = sorted.findIndex((b) => b.id === brand.id);
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === sorted.length - 1) return;

    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    const swapBrand = sorted[swapIndex];

    const reordered = sorted.map((b, i) => ({ id: b.id, displayOrder: i }));
    const currentOrder = reordered.find((r) => r.id === brand.id)!.displayOrder;
    const swapOrder = reordered.find((r) => r.id === swapBrand.id)!.displayOrder;
    reordered.find((r) => r.id === brand.id)!.displayOrder = swapOrder;
    reordered.find((r) => r.id === swapBrand.id)!.displayOrder = currentOrder;

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
      show('success', 'برند حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف برند');
    }
  };

  const columns: Column<ProductBrand>[] = [
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
      header: 'نام برند',
      render: (row) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-neutral-100 flex items-center justify-center">
            <Tag className="w-4 h-4 text-neutral-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-neutral-800">{row.name}</p>
            <p className="text-xs text-neutral-400 mt-0.5">{row.slug}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'توضیحات',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-500">{row.description ?? '—'}</span>
      ),
    },
    {
      key: 'productCount',
      header: 'تعداد محصولات',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-sm text-neutral-600 font-num">{toPersianDigits(row.productCount)}</span>
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
        title="برندها"
        description="مدیریت برندهای محصولات بازار"
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="w-4 h-4" />
            برند جدید
          </Button>
        }
      />

      <div className="mb-4">
        <FilterBar>
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="جستجو در برندها..."
            className="flex-1 max-w-xs"
          />
        </FilterBar>
      </div>

      {isLoading ? (
        <LoadingState label="در حال بارگذاری برندها..." />
      ) : error ? (
        <ErrorState message="خطا در بارگذاری برندها" onRetry={() => refetch()} />
      ) : filteredBrands.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-8 h-8" />}
          title="برندی یافت نشد"
          description={search ? 'با فیلتر انتخاب‌شده برند وجود ندارد' : 'هنوز برندی ایجاد نشده است'}
          action={
            <Button size="sm" onClick={openCreate}>
              <Plus className="w-4 h-4" />
              ایجاد اولین برند
            </Button>
          }
        />
      ) : (
        <DataTable
          columns={columns}
          data={filteredBrands}
          rowKey={(row) => row.id}
        />
      )}

      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingId ? 'ویرایش برند' : 'برند جدید'}
        side="right"
        width="max-w-md"
      >
        <div className="p-4 space-y-5">
          <FormSection>
            <FormField label="نام برند" required>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="نام برند"
              />
            </FormField>

            <FormField label="نامک (slug)" required>
              <Input
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                placeholder="brand-slug"
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

            <FormField label="ترتیب نمایش">
              <Input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </FormField>

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
              {editingId ? 'ذخیره تغییرات' : 'ایجاد برند'}
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
        title="حذف برند"
        message={`آیا از حذف برند «${deleteTarget?.name ?? ''}» مطمئن هستید؟ محصولات مرتبط بدون برند خواهند شد.`}
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
