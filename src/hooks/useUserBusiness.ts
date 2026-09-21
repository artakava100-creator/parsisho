import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { userBusinessService } from '@/services/user-business.service';
import type { UserRegisterBusinessInput, UserUpdateBusinessInput } from '@/types';
import { useToast } from '@/providers/useToast';

export function useMyBusinesses() {
  return useQuery({
    queryKey: ['my-businesses'],
    queryFn: () => userBusinessService.getMyBusinesses(),
  });
}

export function useRegisterBusiness() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: UserRegisterBusinessInput) => userBusinessService.register(input),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      toast.success('کسب‌وکار ثبت شد', `هزینه ثبت: ${result.feePaid} پارسی از کیف پول کسر شد. کسب‌وکار شما در انتظار تأیید مدیر است.`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ثبت کسب‌وکار';
      toast.error('خطا', msg);
    },
  });
}

export function useUpgradeBusinessFeatured() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (businessId: string) => userBusinessService.upgradeFeatured(businessId),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['wallet-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['businesses'] });
      toast.success('ارتقا به ویژه', `کسب‌وکار شما به ویژه ارتقا یافت. هزینه: ${result.feePaid} پارسی`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ارتقا';
      toast.error('خطا', msg);
    },
  });
}

export function useUpdateMyBusiness() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ businessId, input }: { businessId: string; input: UserUpdateBusinessInput }) =>
      userBusinessService.update(businessId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-businesses'] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('ذخیره شد', 'تغییرات کسب‌وکار با موفقیت ذخیره شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش';
      toast.error('خطا', msg);
    },
  });
}

export function useMyBusinessImages(businessId: string | null) {
  return useQuery({
    queryKey: ['my-business-images', businessId],
    queryFn: () => {
      if (!businessId) return [];
      return userBusinessService.listImages(businessId);
    },
    enabled: !!businessId,
  });
}

export function useAddMyBusinessImage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ businessId, imagePath }: { businessId: string; imagePath: string }) =>
      userBusinessService.addImage(businessId, imagePath),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['my-business-images', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('تصویر اضافه شد', 'تصویر با موفقیت افزوده شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در افزودن تصویر';
      toast.error('خطا', msg);
    },
  });
}

export function useDeleteMyBusinessImage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ imageId }: { imageId: string; businessId: string }) =>
      userBusinessService.deleteImage(imageId),
    onSuccess: (_, { businessId }) => {
      queryClient.invalidateQueries({ queryKey: ['my-business-images', businessId] });
      queryClient.invalidateQueries({ queryKey: ['business'] });
      toast.success('تصویر حذف شد', 'تصویر با موفقیت حذف شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در حذف تصویر';
      toast.error('خطا', msg);
    },
  });
}
