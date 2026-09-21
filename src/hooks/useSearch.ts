import { useQuery } from '@tanstack/react-query';
import { searchService } from '@/services/search.service';

export function useSiteSearch(query: string, enabled: boolean = true) {
  return useQuery({
    queryKey: ['site-search', query],
    queryFn: () => searchService.siteSearch(query, 10),
    enabled: enabled && query.trim().length > 0,
    staleTime: 30_000,
  });
}
