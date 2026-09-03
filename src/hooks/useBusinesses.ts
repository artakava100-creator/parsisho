import { useQuery } from '@tanstack/react-query';
import { businessService, type BusinessQueryParams } from '@/services/business.service';

export function useBusinessCategories() {
  return useQuery({
    queryKey: ['business-categories'],
    queryFn: () => businessService.getCategories(),
  });
}

export function useBusinesses(params: BusinessQueryParams) {
  return useQuery({
    queryKey: ['businesses', params.categorySlug, params.search, params.city, params.limit, params.offset],
    queryFn: () => businessService.getBusinesses(params),
  });
}

export function useBusinessBySlug(slug: string | undefined) {
  return useQuery({
    queryKey: ['business', slug],
    queryFn: () => {
      if (!slug) return null;
      return businessService.getBusinessBySlug(slug);
    },
    enabled: !!slug,
  });
}
