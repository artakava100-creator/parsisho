import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminVariantService } from '@/services/admin-variant.service';
import type { CreateVariantInput, UpdateVariantInput } from '@/types';

const VARIANTS_KEY = (productId: string) => ['admin', 'variants', productId];

export function useAdminVariants(productId: string | undefined) {
  return useQuery({
    queryKey: productId ? VARIANTS_KEY(productId) : ['admin', 'variants', 'none'],
    queryFn: () => adminVariantService.listVariants(productId!),
    enabled: !!productId,
  });
}

export function useCreateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateVariantInput) => adminVariantService.createVariant(input),
    onSuccess: (_data, input) => queryClient.invalidateQueries({ queryKey: VARIANTS_KEY(input.productId) }),
  });
}

export function useUpdateVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, input, productId }: { variantId: string; input: UpdateVariantInput; productId: string }) =>
      adminVariantService.updateVariant(variantId, input),
    onSuccess: (_data, { productId }) => queryClient.invalidateQueries({ queryKey: VARIANTS_KEY(productId) }),
  });
}

export function useDeleteVariant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ variantId, productId }: { variantId: string; productId: string }) =>
      adminVariantService.deleteVariant(variantId),
    onSuccess: (_data, { productId }) => queryClient.invalidateQueries({ queryKey: VARIANTS_KEY(productId) }),
  });
}

export function useReorderVariants() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ orderedIds, productId }: { orderedIds: { id: string; displayOrder: number }[]; productId: string }) =>
      adminVariantService.reorderVariants(orderedIds),
    onSuccess: (_data, { productId }) => queryClient.invalidateQueries({ queryKey: VARIANTS_KEY(productId) }),
  });
}
