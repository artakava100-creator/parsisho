import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adService } from '@/services/ad.service';
import type { Advertisement, AdSlot } from '@/types';

export function useAdSlots() {
  return useQuery({
    queryKey: ['ad-slots'],
    queryFn: () => adService.getSlots(),
  });
}

export function useResolveAdSlot(slotKey: string, device: string = 'desktop') {
  return useQuery({
    queryKey: ['ad-slot', slotKey, device],
    queryFn: () => adService.resolveAdSlot(slotKey, device),
    staleTime: 60_000,
  });
}

export function useTrackAdEvent() {
  return useMutation({
    mutationFn: ({ advertisementId, adSlotId, eventType }: { advertisementId: string; adSlotId: string; eventType: 'impression' | 'click' }) =>
      adService.trackEvent(advertisementId, adSlotId, eventType),
  });
}

// Admin hooks
export function useAdminListAdvertisements() {
  return useQuery({
    queryKey: ['admin-advertisements'],
    queryFn: () => adService.adminListAdvertisements(),
  });
}

export function useAdminCreateAdvertisement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof adService.adminCreateAdvertisement>[0]) =>
      adService.adminCreateAdvertisement(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advertisements'] });
    },
  });
}

export function useAdminUpdateAdvertisement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: Parameters<typeof adService.adminUpdateAdvertisement>[0]) =>
      adService.adminUpdateAdvertisement(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advertisements'] });
    },
  });
}

export function useAdminDeleteAdvertisement() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (advertisementId: string) => adService.adminDeleteAdvertisement(advertisementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advertisements'] });
    },
  });
}

export function useAdminSetAdSlots() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ advertisementId, slotIds }: { advertisementId: string; slotIds: string[] }) =>
      adService.adminSetAdSlots(advertisementId, slotIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-advertisements'] });
    },
  });
}

export function useAdminAdAnalytics(advertisementId?: string) {
  return useQuery({
    queryKey: ['admin-ad-analytics', advertisementId ?? 'all'],
    queryFn: () => adService.adminGetAnalytics(advertisementId),
  });
}
