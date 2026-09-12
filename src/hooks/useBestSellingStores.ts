import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface BestSellingStore {
  seller_id: string;
  store_name: string;
  avatar_url: string | null;
  total_sold: number;
  total_revenue: number;
  top_product_name: string | null;
  top_product_image: string | null;
  product_count: number;
}

export function useBestSellingStores(limit = 12) {
  return useQuery({
    queryKey: ['best-selling-stores', limit],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_best_selling_stores', {
        p_limit: limit,
      });
      if (error) throw error;
      return (data as BestSellingStore[]) ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}
