import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminProductService } from '@/services/admin-product.service';
import type {
  CreateProductInput,
  UpdateProductInput,
  ProductStatus,
} from '@/types';

const LIST_KEY = ['admin', 'products'];
const DETAIL_KEY = (id: string) => ['admin', 'products', id];

export function useAdminProducts(params?: {
  search?: string;
  status?: string;
  categoryId?: string;
  brandId?: string;
  limit?: number;
  offset?: number;
}) {
  return useQuery({
    queryKey: [...LIST_KEY, params],
    queryFn: () => adminProductService.listProducts(params),
  });
}

export function useAdminProduct(productId: string | undefined) {
  return useQuery({
    queryKey: productId ? DETAIL_KEY(productId) : ['admin', 'products', 'none'],
    queryFn: () => adminProductService.getProduct(productId!),
    enabled: !!productId,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateProductInput) => adminProductService.createProduct(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, input }: { productId: string; input: UpdateProductInput }) =>
      adminProductService.updateProduct(productId, input),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_KEY(productId) });
    },
  });
}

export function useTransitionProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, newStatus }: { productId: string; newStatus: ProductStatus }) =>
      adminProductService.transitionStatus(productId, newStatus),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_KEY(productId) });
    },
  });
}

export function usePublishProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => adminProductService.publishProduct(productId),
    onSuccess: (_data, productId) => {
      queryClient.invalidateQueries({ queryKey: LIST_KEY });
      queryClient.invalidateQueries({ queryKey: DETAIL_KEY(productId) });
    },
  });
}

export function useSetProductPublishAt() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productId, publishAt }: { productId: string; publishAt: string }) =>
      adminProductService.setPublishAt(productId, publishAt),
    onSuccess: (_data, { productId }) => {
      queryClient.invalidateQueries({ queryKey: DETAIL_KEY(productId) });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (productId: string) => adminProductService.deleteProduct(productId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function useBulkTransitionProductStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ productIds, newStatus }: { productIds: string[]; newStatus: ProductStatus }) =>
      adminProductService.bulkTransitionStatus(productIds, newStatus),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: LIST_KEY }),
  });
}

export function usePreviewProduct() {
  return useQuery({
    queryKey: ['admin', 'products', 'preview'],
    queryFn: () => adminProductService.previewProduct(''),
    enabled: false,
  });
}
