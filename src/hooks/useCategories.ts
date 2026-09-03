import { useQuery } from '@tanstack/react-query';
import { categoryService } from '@/services/category.service';
import type { ProductCategory } from '@/types';

export function useCategories(opts?: { parentId?: string | null; onlyNav?: boolean; onlyHome?: boolean }) {
  return useQuery<ProductCategory[]>({
    queryKey: ['product-categories', opts],
    queryFn: () => categoryService.getCategories(opts),
    staleTime: 120_000,
  });
}

export function useCategoryBySlug(slug: string | undefined) {
  return useQuery<ProductCategory | null>({
    queryKey: ['product-category', slug],
    queryFn: () => {
      if (!slug) return null;
      return categoryService.getCategoryBySlug(slug);
    },
    enabled: !!slug,
    staleTime: 120_000,
  });
}

export function useCategoryById(id: string | undefined) {
  return useQuery<ProductCategory | null>({
    queryKey: ['product-category-by-id', id],
    queryFn: () => {
      if (!id) return null;
      return categoryService.getCategoryById(id);
    },
    enabled: !!id,
    staleTime: 120_000,
  });
}
