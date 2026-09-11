import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { env } from '@/config/env';

export interface MarketPrice {
  category: string;
  symbol: string;
  name_fa: string;
  price: number;
  unit: string;
  change_percent: number;
  sort_order: number;
  updated_at: string;
}

async function fetchMarketPrices(): Promise<MarketPrice[]> {
  // First try reading cached data from the DB
  const { data, error } = await supabase
    .from('market_prices')
    .select('category,symbol,name_fa,price,unit,change_percent,sort_order,updated_at')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true });

  if (error) throw error;

  // If no data in DB yet, trigger the edge function to fetch and populate
  if (!data || data.length === 0) {
    await triggerPriceFetch();
    // Re-read after the edge function populates
    const { data: fresh } = await supabase
      .from('market_prices')
      .select('category,symbol,name_fa,price,unit,change_percent,sort_order,updated_at')
      .order('category', { ascending: true })
      .order('sort_order', { ascending: true });
    return fresh ?? [];
  }

  // If data is stale (older than 2 minutes), trigger a refresh in the background
  const oldestUpdate = data.reduce((min, row) => {
    const ts = new Date(row.updated_at).getTime();
    return ts < min ? ts : min;
  }, Date.now());

  const ageSeconds = (Date.now() - oldestUpdate) / 1000;
  if (ageSeconds > 120) {
    triggerPriceFetch().catch(() => {});
  }

  return data as MarketPrice[];
}

async function triggerPriceFetch(): Promise<void> {
  const url = `${env.supabaseUrl}/functions/v1/fetch-market-prices`;
  await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${env.supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
  });
}

export function useMarketPrices() {
  return useQuery<MarketPrice[]>({
    queryKey: ['market-prices'],
    queryFn: fetchMarketPrices,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
}
