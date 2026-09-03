import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminPackageService, type CreatePackageInput, type UpdatePackageInput } from '@/services/admin-package.service';
import { useToast } from '@/providers/useToast';

export function useAdminPackages() {
  return useQuery({
    queryKey: ['admin-packages'],
    queryFn: () => adminPackageService.getAll(),
  });
}

export function useCreatePackage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: CreatePackageInput) => adminPackageService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['parsi-packages'] });
      toast.success('پکیج ایجاد شد', 'پکیج پارسی جدید با موفقیت ایجاد شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد پکیج';
      toast.error('خطا', msg);
    },
  });
}

export function useUpdatePackage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ packageId, input }: { packageId: string; input: UpdatePackageInput }) =>
      adminPackageService.update(packageId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-packages'] });
      queryClient.invalidateQueries({ queryKey: ['parsi-packages'] });
      toast.success('پکیج ویرایش شد', 'تغییرات با موفقیت ذخیره شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش پکیج';
      toast.error('خطا', msg);
    },
  });
}
