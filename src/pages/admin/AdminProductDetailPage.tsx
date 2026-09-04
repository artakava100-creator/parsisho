import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { ArrowRight, Save, Trash2, Plus, Pencil, Eye, EyeOff } from 'lucide-react';
import {
  useAdminProduct,
  useCreateProduct,
  useUpdateProduct,
  useTransitionProductStatus,
  useDeleteProduct,
  useSetProductPublishAt,
} from '@/hooks/useAdminProduct';
import { useAdminCategories } from '@/hooks/useAdminCategory';
import { useAdminBrands } from '@/hooks/useAdminBrand';
import { useAdminVariants, useCreateVariant, useUpdateVariant, useDeleteVariant } from '@/hooks/useAdminVariant';
import { AdminPageHeader } from '@/components/admin/AdminPageHeader';
import { Breadcrumb, buildBreadcrumbs } from '@/components/admin/Breadcrumb';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { LoadingState, ErrorState } from '@/components/admin/LoadingErrorState';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Drawer } from '@/components/admin/Drawer';
import { ConfirmDialog } from '@/components/admin/ConfirmDialog';
import { FormSection, FormField, FormRow, FormActions } from '@/components/admin/FormControls';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useToast } from '@/providers/useToast';
import type {
  ProductStatus,
  ProductVariant,
  CreateVariantInput,
  UpdateVariantInput,
} from '@/types';

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

interface ProductFormData {
  name: string;
  slug: string;
  categoryId: string;
  sku: string;
  shortDescription: string;
  description: string;
  brandId: string;
  sortOrder: number;
  isNew: boolean;
  isSelected: boolean;
  isEconomic: boolean;
  isBestSeller: boolean;
  isPopular: boolean;
  isSpecialOffer: boolean;
  isDiscounted: boolean;
  isActive: boolean;
}

const defaultFormData: ProductFormData = {
  name: '',
  slug: '',
  categoryId: '',
  sku: '',
  shortDescription: '',
  description: '',
  brandId: '',
  sortOrder: 0,
  isNew: false,
  isSelected: false,
  isEconomic: false,
  isBestSeller: false,
  isPopular: false,
  isSpecialOffer: false,
  isDiscounted: false,
  isActive: true,
};

interface VariantFormData {
  name: string;
  sku: string;
  attributes: string;
  sortOrder: number;
}

const defaultVariantData: VariantFormData = {
  name: '',
  sku: '',
  attributes: '{}',
  sortOrder: 0,
};

export function AdminProductDetailPage() {
  const params = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { show } = useToast();

  const productId = params.id ?? '';
  const isNew = productId === 'new';

  const { data: product, isLoading, error, refetch } = useAdminProduct(isNew ? undefined : productId);
  const { data: categories } = useAdminCategories();
  const { data: brands } = useAdminBrands();
  const { data: variants } = useAdminVariants(isNew ? undefined : productId);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const transitionMutation = useTransitionProductStatus();
  const deleteMutation = useDeleteProduct();
  const setPublishAtMutation = useSetProductPublishAt();

  const createVariantMutation = useCreateVariant();
  const updateVariantMutation = useUpdateVariant();
  const deleteVariantMutation = useDeleteVariant();

  const [formData, setFormData] = useState<ProductFormData>(defaultFormData);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProductVariant | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [publishAt, setPublishAt] = useState<string>('');

  const [variantDrawerOpen, setVariantDrawerOpen] = useState(false);
  const [editingVariantId, setEditingVariantId] = useState<string | null>(null);
  const [variantFormData, setVariantFormData] = useState<VariantFormData>(defaultVariantData);
  const [variantFormError, setVariantFormError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name,
        slug: product.slug,
        categoryId: product.categoryId,
        sku: product.sku ?? '',
        shortDescription: product.shortDescription ?? '',
        description: product.description ?? '',
        brandId: product.brandId ?? '',
        sortOrder: product.sortOrder,
        isNew: product.isNew,
        isSelected: product.isSelected,
        isEconomic: product.isEconomic,
        isBestSeller: product.isBestSeller,
        isPopular: product.isPopular,
        isSpecialOffer: product.isSpecialOffer,
        isDiscounted: product.isDiscounted,
        isActive: product.isActive,
      });
      if (product.publishAt) {
        setPublishAt(new Date(product.publishAt).toISOString().slice(0, 16));
      }
    }
  }, [product]);

  const breadcrumbs = buildBreadcrumbs(location.pathname, product?.name ?? 'محصول جدید');

  const handleSubmit = async () => {
    setFormError(null);

    if (!formData.name.trim()) {
      setFormError('نام محصول الزامی است');
      return;
    }
    if (!formData.slug.trim()) {
      setFormError('نامک محصول الزامی است');
      return;
    }
    if (!formData.categoryId) {
      setFormError('دسته‌بندی الزامی است');
      return;
    }

    try {
      if (isNew) {
        const id = await createMutation.mutateAsync({
          name: formData.name,
          slug: formData.slug,
          categoryId: formData.categoryId,
          sku: formData.sku || null,
          shortDescription: formData.shortDescription || null,
          description: formData.description || null,
          brandId: formData.brandId || null,
          status: 'draft',
          sortOrder: formData.sortOrder,
        });
        show('success', 'محصول ایجاد شد');
        navigate(`/admin/marketplace/products/${id}`);
      } else {
        await updateMutation.mutateAsync({
          productId,
          input: {
            name: formData.name,
            slug: formData.slug,
            categoryId: formData.categoryId,
            sku: formData.sku || null,
            shortDescription: formData.shortDescription || null,
            description: formData.description || null,
            brandId: formData.brandId || null,
            sortOrder: formData.sortOrder,
            isNew: formData.isNew,
            isSelected: formData.isSelected,
            isEconomic: formData.isEconomic,
            isBestSeller: formData.isBestSeller,
            isPopular: formData.isPopular,
            isSpecialOffer: formData.isSpecialOffer,
            isDiscounted: formData.isDiscounted,
            isActive: formData.isActive,
          },
        });
        show('success', 'تغییرات ذخیره شد');
      }
    } catch (err) {
      setFormError((err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی');
    }
  };

  const handleTransition = async (newStatus: ProductStatus) => {
    try {
      await transitionMutation.mutateAsync({ productId, newStatus });
      show('success', `وضعیت به «${STATUS_LABELS[newStatus]}» تغییر یافت`);
    } catch (err) {
      show('error', 'خطا در تغییر وضعیت', (err as { message?: string })?.message);
    }
  };

  const handleSetPublishAt = async () => {
    if (!publishAt) return;
    try {
      await setPublishAtMutation.mutateAsync({ productId, publishAt: new Date(publishAt).toISOString() });
      show('success', 'زمان انتشار تنظیم شد');
    } catch (err) {
      show('error', 'خطا در تنظیم زمان انتشار', (err as { message?: string })?.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteVariantMutation.mutateAsync({ variantId: deleteTarget.id, productId });
      show('success', 'تنوع حذف شد');
      setDeleteTarget(null);
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف تنوع');
    }
  };

  const openCreateVariant = () => {
    setEditingVariantId(null);
    setVariantFormData({ ...defaultVariantData, sortOrder: variants?.length ?? 0 });
    setVariantFormError(null);
    setVariantDrawerOpen(true);
  };

  const openEditVariant = (variant: ProductVariant) => {
    setEditingVariantId(variant.id);
    setVariantFormData({
      name: variant.name,
      sku: variant.sku ?? '',
      attributes: JSON.stringify(variant.attributes, null, 2),
      sortOrder: variant.sortOrder,
    });
    setVariantFormError(null);
    setVariantDrawerOpen(true);
  };

  const handleVariantSubmit = async () => {
    setVariantFormError(null);

    if (!variantFormData.name.trim()) {
      setVariantFormError('نام تنوع الزامی است');
      return;
    }

    let parsedAttributes: Record<string, unknown> = {};
    try {
      parsedAttributes = JSON.parse(variantFormData.attributes || '{}');
    } catch {
      setVariantFormError('فرمت ویژگی‌ها نامعتبر است (باید JSON معتبر باشد)');
      return;
    }

    try {
      if (editingVariantId) {
        const input: UpdateVariantInput = {
          name: variantFormData.name,
          sku: variantFormData.sku || null,
          attributes: parsedAttributes,
          sortOrder: variantFormData.sortOrder,
        };
        await updateVariantMutation.mutateAsync({ variantId: editingVariantId, input, productId });
        show('success', 'تنوع به‌روزرسانی شد');
      } else {
        const input: CreateVariantInput = {
          productId,
          name: variantFormData.name,
          attributes: parsedAttributes,
          sku: variantFormData.sku || null,
          sortOrder: variantFormData.sortOrder,
        };
        await createVariantMutation.mutateAsync(input);
        show('success', 'تنوع ایجاد شد');
      }
      setVariantDrawerOpen(false);
    } catch (err) {
      setVariantFormError((err as { message?: string })?.message ?? 'خطا در ذخیره‌سازی تنوع');
    }
  };

  const handleDeleteProduct = async () => {
    setDeleteError(null);
    try {
      await deleteMutation.mutateAsync(productId);
      show('success', 'محصول حذف شد');
      navigate('/admin/marketplace/products');
    } catch (err) {
      setDeleteError((err as { message?: string })?.message ?? 'خطا در حذف محصول');
    }
  };

  const variantColumns: Column<ProductVariant>[] = [
    {
      key: 'name',
      header: 'نام تنوع',
      render: (row) => (
        <div>
          <p className="text-sm font-medium text-neutral-800">{row.name}</p>
          {row.sku && <p className="text-xs text-neutral-400 mt-0.5">SKU: {row.sku}</p>}
        </div>
      ),
    },
    {
      key: 'attributes',
      header: 'ویژگی‌ها',
      hideOnMobile: true,
      render: (row) => (
        <span className="text-xs text-neutral-500 font-mono">
          {JSON.stringify(row.attributes)}
        </span>
      ),
    },
    {
      key: 'isActive',
      header: 'فعال',
      render: (row) => (
        <StatusBadge status={row.isActive ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      header: 'عملیات',
      align: 'center',
      render: (row) => (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); openEditVariant(row); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-primary-700 hover:bg-primary-50 transition-colors"
            aria-label="ویرایش تنوع"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); setDeleteError(null); }}
            className="w-7 h-7 flex items-center justify-center rounded text-neutral-500 hover:text-error-600 hover:bg-error-50 transition-colors"
            aria-label="حذف تنوع"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    },
  ];

  if (!isNew && isLoading) {
    return <LoadingState label="در حال بارگذاری محصول..." />;
  }
  if (!isNew && error) {
    return <ErrorState message="خطا در بارگذاری محصول" onRetry={() => refetch()} />;
  }
  if (!isNew && !product) {
    return (
      <EmptyState
        icon={<ArrowRight className="w-8 h-8" />}
        title="محصول یافت نشد"
        description="محصول موردنظر وجود ندارد"
        action={<Button size="sm" onClick={() => navigate('/admin/marketplace/products')}>بازگشت به لیست</Button>}
      />
    );
  }

  const currentStatus = product?.status ?? 'draft';

  return (
    <div>
      <AdminPageHeader
        title={isNew ? 'محصول جدید' : product!.name}
        description={isNew ? 'ایجاد محصول جدید' : `وضعیت: ${STATUS_LABELS[currentStatus]}`}
        breadcrumbs={<Breadcrumb items={breadcrumbs} />}
        actions={
          <Button size="sm" variant="outline" onClick={() => navigate('/admin/marketplace/products')}>
            <ArrowRight className="w-4 h-4" />
            بازگشت
          </Button>
        }
      />

      {/* Status & Lifecycle */}
      {!isNew && (
        <div className="mb-6 p-4 rounded-xl border border-neutral-200 bg-surface">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="text-sm text-neutral-500">وضعیت فعلی:</span>
              <StatusBadge status={currentStatus} />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {ALLOWED_TRANSITIONS[currentStatus].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant="outline"
                  loading={transitionMutation.isPending}
                  onClick={() => handleTransition(s)}
                >
                  {STATUS_LABELS[s]}
                </Button>
              ))}
              {currentStatus === 'archived' && (
                <Button
                  size="sm"
                  variant="danger"
                  loading={deleteMutation.isPending}
                  onClick={handleDeleteProduct}
                >
                  <Trash2 className="w-4 h-4" />
                  حذف محصول
                </Button>
              )}
            </div>
          </div>

          {currentStatus === 'review' && (
            <div className="mt-4 pt-4 border-t border-neutral-100">
              <div className="flex items-end gap-2 flex-wrap">
                <FormField label="زمان انتشار" hint="برای زمان‌بندی، تاریخ و ساعت را تعیین کنید">
                  <Input
                    type="datetime-local"
                    value={publishAt}
                    onChange={(e) => setPublishAt(e.target.value)}
                    className="w-auto"
                  />
                </FormField>
                <Button size="sm" onClick={handleSetPublishAt} loading={setPublishAtMutation.isPending}>
                  تنظیم زمان
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Product Form */}
      <FormSection title="اطلاعات محصول">
        <FormField label="نام محصول" required>
          <Input
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="نام محصول"
          />
        </FormField>

        <FormRow>
          <FormField label="نامک (slug)" required hint="نام انگلیسی یکتا برای URL">
            <Input
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="product-slug"
            />
          </FormField>
          <FormField label="SKU" hint="کد یکتا کالا">
            <Input
              value={formData.sku}
              onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
              placeholder="SKU-001"
            />
          </FormField>
        </FormRow>

        <FormRow>
          <FormField label="دسته‌بندی" required>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">انتخاب دسته‌بندی...</option>
              {(categories ?? []).map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="برند">
            <select
              value={formData.brandId}
              onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
              className="w-full h-11 px-3 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
            >
              <option value="">بدون برند</option>
              {(brands ?? []).map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </FormField>
        </FormRow>

        <FormField label="توضیح کوتاه">
          <Input
            value={formData.shortDescription}
            onChange={(e) => setFormData({ ...formData, shortDescription: e.target.value })}
            placeholder="توضیح مختصر محصول"
          />
        </FormField>

        <FormField label="توضیحات کامل">
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="توضیحات کامل محصول"
            rows={4}
            className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
          />
        </FormField>

        <FormField label="ترتیب نمایش" hint="عدد کمتر = نمایش زودتر">
          <Input
            type="number"
            value={formData.sortOrder}
            onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
          />
        </FormField>
      </FormSection>

      <FormSection title="برچسب‌های محصول">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {([
            { key: 'isNew', label: 'جدید' },
            { key: 'isSelected', label: 'انتخاب‌شده' },
            { key: 'isEconomic', label: 'اقتصادی' },
            { key: 'isBestSeller', label: 'پرفروش' },
            { key: 'isPopular', label: 'محبوب' },
            { key: 'isSpecialOffer', label: 'پیشنهاد ویژه' },
            { key: 'isDiscounted', label: 'تخفیف‌دار' },
            { key: 'isActive', label: 'فعال' },
          ] as const).map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer p-2 rounded-lg hover:bg-neutral-50">
              <input
                type="checkbox"
                checked={formData[key]}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                className="w-4 h-4 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-neutral-700">{label}</span>
            </label>
          ))}
        </div>
      </FormSection>

      {formError && (
        <div className="mb-4 px-3 py-2 rounded-lg bg-error-50 border border-error-200 text-sm text-error-700">
          {formError}
        </div>
      )}

      <FormActions>
        <Button onClick={handleSubmit} loading={createMutation.isPending || updateMutation.isPending}>
          <Save className="w-4 h-4" />
          {isNew ? 'ایجاد محصول' : 'ذخیره تغییرات'}
        </Button>
      </FormActions>

      {/* Variants section */}
      {!isNew && (
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-neutral-800">تنوع‌های محصول</h3>
            <Button size="sm" onClick={openCreateVariant}>
              <Plus className="w-4 h-4" />
              تنوع جدید
            </Button>
          </div>

          {!variants || variants.length === 0 ? (
            <EmptyState
              icon={<Plus className="w-8 h-8" />}
              title="تنوعی یافت نشد"
              description="هنوز تنوعی برای این محصول ایجاد نشده است"
              action={
                <Button size="sm" onClick={openCreateVariant}>
                  <Plus className="w-4 h-4" />
                  ایجاد اولین تنوع
                </Button>
              }
            />
          ) : (
            <DataTable
              columns={variantColumns}
              data={variants}
              rowKey={(row) => row.id}
            />
          )}
        </div>
      )}

      {/* Variant Drawer */}
      <Drawer
        open={variantDrawerOpen}
        onClose={() => setVariantDrawerOpen(false)}
        title={editingVariantId ? 'ویرایش تنوع' : 'تنوع جدید'}
        side="right"
        width="max-w-md"
      >
        <div className="p-4 space-y-5">
          <FormSection>
            <FormField label="نام تنوع" required>
              <Input
                value={variantFormData.name}
                onChange={(e) => setVariantFormData({ ...variantFormData, name: e.target.value })}
                placeholder="مثال: قرمز - سایز M"
              />
            </FormField>

            <FormField label="SKU تنوع">
              <Input
                value={variantFormData.sku}
                onChange={(e) => setVariantFormData({ ...variantFormData, sku: e.target.value })}
                placeholder="VAR-001"
              />
            </FormField>

            <FormField label="ویژگی‌ها (JSON)" hint='مثال: {"color": "red", "size": "M"}'>
              <textarea
                value={variantFormData.attributes}
                onChange={(e) => setVariantFormData({ ...variantFormData, attributes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-surface text-sm text-neutral-700 font-mono focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              />
            </FormField>

            <FormField label="ترتیب نمایش">
              <Input
                type="number"
                value={variantFormData.sortOrder}
                onChange={(e) => setVariantFormData({ ...variantFormData, sortOrder: parseInt(e.target.value) || 0 })}
              />
            </FormField>
          </FormSection>

          {variantFormError && (
            <div className="px-3 py-2 rounded-lg bg-error-50 border border-error-200 text-sm text-error-700">
              {variantFormError}
            </div>
          )}

          <FormActions>
            <Button
              size="sm"
              onClick={handleVariantSubmit}
              loading={createVariantMutation.isPending || updateVariantMutation.isPending}
            >
              {editingVariantId ? 'ذخیره تغییرات' : 'ایجاد تنوع'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setVariantDrawerOpen(false)}>
              انصراف
            </Button>
          </FormActions>
        </div>
      </Drawer>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => { setDeleteTarget(null); setDeleteError(null); }}
        onConfirm={handleDelete}
        title="حذف تنوع"
        message={`آیا از حذف تنوع «${deleteTarget?.name ?? ''}» مطمئن هستید؟`}
        confirmLabel="حذف"
        loading={deleteVariantMutation.isPending}
      />
      {deleteError && (
        <div className="fixed bottom-4 left-4 z-[100] px-4 py-3 rounded-lg bg-error-50 border border-error-200 text-sm text-error-700 max-w-sm">
          {deleteError}
        </div>
      )}
    </div>
  );
}
