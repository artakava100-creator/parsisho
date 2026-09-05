import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminAuctionService, auctionMediaService, type CreateAuctionInput, type UpdateAuctionInput } from '@/services/admin-auction.service';
import { useToast } from '@/providers/useToast';

export function useAdminAuctions() {
  return useQuery({
    queryKey: ['admin-auctions'],
    queryFn: () => adminAuctionService.getAll(),
  });
}

export function useCreateAuction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (input: CreateAuctionInput) => adminAuctionService.create(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('مزایده ایجاد شد', 'مزایده جدید با موفقیت ایجاد شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ایجاد مزایده';
      toast.error('خطا', msg);
    },
  });
}

export function useUpdateAuction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ auctionId, input }: { auctionId: string; input: UpdateAuctionInput }) =>
      adminAuctionService.update(auctionId, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('مزایده ویرایش شد', 'تغییرات با موفقیت ذخیره شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در ویرایش مزایده';
      toast.error('خطا', msg);
    },
  });
}

export function useScheduleAuction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (auctionId: string) => adminAuctionService.schedule(auctionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('مزایده برنامه‌ریزی شد', 'مزایده در وضعیت برنامه‌ریزی‌شده قرار گرفت');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در برنامه‌ریزی مزایده';
      toast.error('خطا', msg);
    },
  });
}

export function useGoLiveAuction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (auctionId: string) => adminAuctionService.goLive(auctionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('مزایده شروع شد', 'مزایده اکنون زنده است');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در شروع مزایده';
      toast.error('خطا', msg);
    },
  });
}

export function useCancelAuction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (auctionId: string) => adminAuctionService.cancel(auctionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('مزایده لغو شد', 'مزایده با موفقیت لغو شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در لغو مزایده';
      toast.error('خطا', msg);
    },
  });
}

export function useFinalizeAuction() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: (auctionId: string) => adminAuctionService.finalize(auctionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      toast.success('مزایده پایان یافت', 'برنده با موفقیت تعیین شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در پایان دادن به مزایده';
      toast.error('خطا', msg);
    },
  });
}

export function useAuctionMedia(auctionId: string | null) {
  return useQuery({
    queryKey: ['auction-media', auctionId],
    queryFn: () => auctionMediaService.getByAuctionId(auctionId!),
    enabled: !!auctionId,
  });
}

export function useAddAuctionMedia() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ auctionId, url, sortOrder, isPrimary }: { auctionId: string; url: string; sortOrder: number; isPrimary: boolean }) =>
      auctionMediaService.add(auctionId, url, sortOrder, isPrimary),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction-media', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در افزودن تصویر';
      toast.error('خطا', msg);
    },
  });
}

export function useDeleteAuctionMedia() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ mediaId }: { mediaId: string; auctionId: string }) =>
      auctionMediaService.delete(mediaId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction-media', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
      toast.success('تصویر حذف شد');
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در حذف تصویر';
      toast.error('خطا', msg);
    },
  });
}

export function useReorderAuctionMedia() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation({
    mutationFn: ({ items }: { items: { id: string; sort_order: number; is_primary: boolean }[]; auctionId: string }) =>
      auctionMediaService.reorder(items),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction-media', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['admin-auctions'] });
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : 'خطا در مرتب‌سازی تصاویر';
      toast.error('خطا', msg);
    },
  });
}
