import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminCategoryService } from '@/services/admin-category.service';
import type { CreateCategoryInput, UpdateCategoryInput } from '@/types';

const QUERY_KEY = ['admin', 'categories'];

export function useAdminCategories() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => adminCategoryService.listCategories(),
  });
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateCategoryInput) => adminCategoryService.createCategory(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useUpdateCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ categoryId, input }: { categoryId: string; input: UpdateCategoryInput }) =>
      adminCategoryService.updateCategory(categoryId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (categoryId: string) => adminCategoryService.deleteCategory(categoryId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}

export function useReorderCategories() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (orderedIds: { id: string; displayOrder: number }[]) =>
      adminCategoryService.reorderCategories(orderedIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });
}
