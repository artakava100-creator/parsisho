import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminStorefrontService } from '@/services/admin-storefront.service';
import type {
  StorefrontSection,
  CreateStorefrontSectionInput,
  UpdateStorefrontSectionInput,
} from '@/types';

const QUERY_KEY = ['admin', 'storefront-sections'];

export function useAdminStorefrontSections() {
  return useQuery<StorefrontSection[]>({
    queryKey: QUERY_KEY,
    queryFn: () => adminStorefrontService.listSections(),
  });
}

export function useCreateStorefrontSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateStorefrontSectionInput) => adminStorefrontService.createSection(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateStorefrontSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, input }: { sectionId: string; input: UpdateStorefrontSectionInput }) =>
      adminStorefrontService.updateSection(sectionId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteStorefrontSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) => adminStorefrontService.deleteSection(sectionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReorderStorefrontSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: { id: string; displayOrder: number }[]) =>
      adminStorefrontService.reorderSections(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useToggleStorefrontSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, isEnabled }: { sectionId: string; isEnabled: boolean }) =>
      adminStorefrontService.toggleSection(sectionId, isEnabled),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
