import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminBrandService } from '@/services/admin-brand.service';
import type { CreateBrandInput, UpdateBrandInput } from '@/types';

const QUERY_KEY = ['admin', 'brands'];

export function useAdminBrands() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminBrandService.listBrands(),
  });
}

export function useCreateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateBrandInput) => adminBrandService.createBrand(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ brandId, input }: { brandId: string; input: UpdateBrandInput }) =>
      adminBrandService.updateBrand(brandId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteBrand() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (brandId: string) => adminBrandService.deleteBrand(brandId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReorderBrands() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: { id: string; displayOrder: number }[]) =>
      adminBrandService.reorderBrands(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
