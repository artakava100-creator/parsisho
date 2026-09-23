import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  businessSlideService,
} from '@/services/business-slide.service';
import type {
  CreateBusinessSlideInput,
  UpdateBusinessSlideInput,
  CreateSlideLayerInput,
  UpdateSlideLayerInput,
} from '@/types';

const BIZ_SLIDES_KEY = 'business-slides';

export function useActiveBusinessSlides() {
  return useQuery({
    queryKey: [BIZ_SLIDES_KEY, 'active'],
    queryFn: async () => {
      const { data, error } = await businessSlideService.getActiveSlides();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAdminBusinessSlides() {
  return useQuery({
    queryKey: [BIZ_SLIDES_KEY, 'admin'],
    queryFn: async () => {
      const { data, error } = await businessSlideService.adminListSlides();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useAdminBusinessSlideDetail(slideId: string | null) {
  return useQuery({
    queryKey: [BIZ_SLIDES_KEY, 'admin', slideId],
    queryFn: async () => {
      if (!slideId) return null;
      const { data, error } = await businessSlideService.adminGetSlide(slideId);
      if (error) throw new Error(error);
      return data;
    },
    enabled: !!slideId,
  });
}

export function useCreateBusinessSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateBusinessSlideInput) => {
      const result = await businessSlideService.adminCreateSlide(input);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useUpdateBusinessSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slideId, input }: { slideId: string; input: UpdateBusinessSlideInput }) => {
      const result = await businessSlideService.adminUpdateSlide(slideId, input);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useDeleteBusinessSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slideId: string) => {
      const result = await businessSlideService.adminDeleteSlide(slideId);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useDuplicateBusinessSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slideId: string) => {
      const result = await businessSlideService.adminDuplicateSlide(slideId);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useReorderBusinessSlides() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (items: Array<{ id: string; sortOrder: number }>) => {
      const result = await businessSlideService.adminReorderSlides(items);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useCreateSlideLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateSlideLayerInput) => {
      const result = await businessSlideService.adminCreateLayer(input);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useUpdateSlideLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ layerId, input }: { layerId: string; input: UpdateSlideLayerInput }) => {
      const result = await businessSlideService.adminUpdateLayer(layerId, input);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useDeleteSlideLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (layerId: string) => {
      const result = await businessSlideService.adminDeleteLayer(layerId);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}

export function useReorderSlideLayers() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ slideId, items }: { slideId: string; items: Array<{ id: string; sortOrder: number }> }) => {
      const result = await businessSlideService.adminReorderLayers(slideId, items);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BIZ_SLIDES_KEY] });
    },
  });
}
