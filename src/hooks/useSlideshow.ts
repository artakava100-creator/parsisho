import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { slideshowService, type Slide } from '@/services/slideshow.service';

const SLIDESHOW_KEY = 'slideshow';

export function useActiveSlides() {
  return useQuery({
    queryKey: [SLIDESHOW_KEY, 'active'],
    queryFn: async () => {
      const { data, error } = await slideshowService.getActiveSlides();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAdminSlides() {
  return useQuery({
    queryKey: [SLIDESHOW_KEY, 'admin'],
    queryFn: async () => {
      const { data, error } = await slideshowService.adminListSlides();
      if (error) throw new Error(error);
      return data;
    },
    staleTime: 30 * 1000,
  });
}

export function useUpsertSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (slide: Partial<Slide> & { id?: string }) => {
      const result = await slideshowService.adminUpsertSlide(slide);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SLIDESHOW_KEY] });
    },
  });
}

export function useDeleteSlide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const result = await slideshowService.adminDeleteSlide(id);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SLIDESHOW_KEY] });
    },
  });
}
