import { useQuery } from '@tanstack/react-query';
import { productService } from '@/services/product.service';
import type { Product } from '@/types';

export function useProducts(opts?: {
  categoryId?: string;
  limit?: number;
  offset?: number;
  onlyBestSellers?: boolean;
  onlyNew?: boolean;
}) {
  return useQuery<Product[]>({
    queryKey: ['products', opts],
    queryFn: () => productService.getProducts(opts),
    staleTime: 60_000,
  });
}

export function useProductBySlug(slug: string | undefined) {
  return useQuery<Product | null>({
    queryKey: ['product', slug],
    queryFn: () => {
      if (!slug) return null;
      return productService.getProductBySlug(slug);
    },
    enabled: !!slug,
    staleTime: 60_000,
  });
}

export function useProductById(id: string | undefined) {
  return useQuery<Product | null>({
    queryKey: ['product-by-id', id],
    queryFn: () => {
      if (!id) return null;
      return productService.getProductById(id);
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

export function useProductVariants(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-variants', productId],
    queryFn: () => {
      if (!productId) return [];
      return productService.getVariants(productId);
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
}

export function useProductMedia(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-media', productId],
    queryFn: () => {
      if (!productId) return [];
      return productService.getMedia(productId);
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
}

export function useProductInventory(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-inventory', productId],
    queryFn: () => {
      if (!productId) return null;
      return productService.getInventory(productId);
    },
    enabled: !!productId,
    staleTime: 30_000,
  });
}

export function useProductPrices(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-prices', productId],
    queryFn: () => {
      if (!productId) return [];
      return productService.getPrices(productId);
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
}

export function useEffectivePrice(productId: string | undefined) {
  return useQuery({
    queryKey: ['product-effective-price', productId],
    queryFn: () => {
      if (!productId) return null;
      return productService.getEffectivePrice(productId);
    },
    enabled: !!productId,
    staleTime: 60_000,
  });
}
