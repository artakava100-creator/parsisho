import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBusinessService } from '@/services/admin-business.service';
import type { CreateBusinessInput, UpdateBusinessInput } from '@/types';
import { useToast } from '@/providers/useToast';

export function useAdminBusinessCategories() {
  return useQuery({
    queryKey: ['admin-business-categories'],
    queryFn: () => adminBusinessService.getAllCategories(),
  });
}

export function useAdminProvinces() {
  return useQuery({
    queryKey: ['admin-provinces'],
    queryFn: () => adminBusinessService.listProvinces(),
    staleTime: Infinity,
  });
}

export function useAdminCities(provinceId: string | null) {
  return useQuery({
    queryKey: ['admin-cities', provinceId],
    queryFn: () => adminBusinessService.listCities(provinceId!),
    enabled: !!provinceId,
    staleTime: Infinity,
  });
}

export function useAdminBusinesses(params: {
  status?: string | null;
  categoryId?: string | null;
  search?: string | null;
}) {
  return useQuery({
    queryKey: ['admin-businesses', params.status, params.categoryId, params.search],
    queryFn: () => adminBusinessService.listBusinesses(params),
  });
}

export function useCreateBusiness() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: CreateBusinessInput) => adminBusinessService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('کسب‌وکار ایجاد شد', 'کسب‌وکار جدید با موفقیت ایجاد شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد کسب‌وکار';
      toast.error('خطا', msg);
    },
  });
}

export function useUpdateBusiness() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ businessId, input }: { businessId: string; input: UpdateBusinessInput }) =>
      adminBusinessService.update(businessId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('کسب‌وکار ویرایش شد', 'تغییرات با موفقیت ذخیره شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش کسب‌وکار';
      toast.error('خطا', msg);
    },
  });
}

export function useDeleteBusiness() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (businessId: string) => adminBusinessService.delete(businessId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('کسب‌وکار حذف شد', 'کسب‌وکار با موفقیت حذف شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در حذف کسب‌وکار';
      toast.error('خطا', msg);
    },
  });
}

export function useAdminBusinessImages(businessId: string | null) {
  return useQuery({
    queryKey: ['admin-business-images', businessId],
    queryFn: () => {
      if (!businessId) return [];
      return adminBusinessService.listImages(businessId);
    },
    enabled: !!businessId,
  });
}

export function useAddBusinessImage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ businessId, imagePath }: { businessId: string; imagePath: string }) =>
      adminBusinessService.addImage(businessId, imagePath),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-images', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('تصویر اضافه شد', 'تصویر با موفقیت افزوده شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در افزودن تصویر';
      toast.error('خطا', msg);
    },
  });
}

export function useDeleteBusinessImage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ imageId, businessId }: { imageId: string; businessId: string }) =>
      adminBusinessService.deleteImage(imageId),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-images', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('تصویر حذف شد', 'تصویر با موفقیت حذف شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در حذف تصویر';
      toast.error('خطا', msg);
    },
  });
}

// ─── Business Category Management ────────────────────────────────────

export function useCreateBusinessCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: {
      name: string;
      slug: string;
      description?: string | null;
      iconName?: string | null;
      displayOrder?: number;
      isActive?: boolean;
    }) => adminBusinessService.createCategory(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-categories'] });
      queryClient.invalidateQueries({ queryKey: ['business-categories'] });
      toast.success('دسته‌بندی ایجاد شد', 'دسته‌بندی جدید با موفقیت ایجاد شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد دسته‌بندی';
      toast.error('خطا', msg);
    },
  });
}

export function useUpdateBusinessCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ categoryId, input }: {
      categoryId: string;
      input: {
        name?: string | null;
        slug?: string | null;
        description?: string | null;
        iconName?: string | null;
        displayOrder?: number | null;
        isActive?: boolean | null;
      };
    }) => adminBusinessService.updateCategory(categoryId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-categories'] });
      queryClient.invalidateQueries({ queryKey: ['business-categories'] });
      toast.success('دسته‌بندی ویرایش شد', 'تغییرات با موفقیت ذخیره شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش دسته‌بندی';
      toast.error('خطا', msg);
    },
  });
}

export function useDeleteBusinessCategory() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (categoryId: string) => adminBusinessService.deleteCategory(categoryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-categories'] });
      queryClient.invalidateQueries({ queryKey: ['business-categories'] });
      toast.success('دسته‌بندی حذف شد', 'دسته‌بندی با موفقیت حذف شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در حذف دسته‌بندی';
      toast.error('خطا', msg);
    },
  });
}

export function useReorderBusinessCategories() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (items: Array<{ id: string; display_order: number }>) =>
      adminBusinessService.reorderCategories(items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-business-categories'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در مرتب‌سازی';
      toast.error('خطا', msg);
    },
  });
}
