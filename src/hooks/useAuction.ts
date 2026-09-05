import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';
import { auctionService } from '@/services/auction.service';
import type { HomepageAuction } from '@/services/auction.service';
import { bidService } from '@/services/bid.service';
import { supabase } from '@/lib/supabase';
import type { PlaceClickResult } from '@/types';

export function useHomepageAuction() {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const query = useQuery({
    queryKey: ['homepage-auction'],
    queryFn: () => auctionService.getHomepageAuction(),
    staleTime: 30_000,
  });

  const auctionId = query.data?.id;

  useEffect(() => {
    if (!auctionId) return;

    channelRef.current = supabase
      .channel(`homepage-auction-${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ['homepage-auction'] });
        },
      )
      .subscribe();

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [auctionId, queryClient]);

  return query;
}

export function useAuctions() {
  return useQuery({
    queryKey: ['auctions'],
    queryFn: () => auctionService.getAll(),
  });
}

export function useIranToday() {
  return useQuery({
    queryKey: ['iran-today'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_iran_today');
      if (error) throw error;
      return data as string;
    },
    staleTime: 60_000,
  });
}

export function useServerTime() {
  return useQuery({
    queryKey: ['server-time'],
    queryFn: () => auctionService.getServerTime(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 3,
  });
}

export function useAuction(id: string | undefined) {
  return useQuery({
    queryKey: ['auction', id],
    queryFn: () => {
      if (!id) return null;
      return auctionService.getById(id);
    },
    enabled: Boolean(id),
  });
}

export function useAuctionDetail(id: string | undefined) {
  const queryClient = useQueryClient();
  const channelRef = useRef<ReturnType<typeof bidService.subscribeToAuction> | null>(null);

  const query = useQuery({
    queryKey: ['auction-detail', id],
    queryFn: () => {
      if (!id) return null;
      return auctionService.getDetail(id);
    },
    enabled: Boolean(id),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  useEffect(() => {
    if (!id) return;

    channelRef.current = bidService.subscribeToAuction(id, () => {
      queryClient.invalidateQueries({ queryKey: ['auction-detail', id] });
      queryClient.invalidateQueries({ queryKey: ['auction', id] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
    });

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [id, queryClient]);

  return query;
}

export function useAuctionMedia(auctionId: string | undefined) {
  return useQuery({
    queryKey: ['auction-media', auctionId],
    queryFn: () => {
      if (!auctionId) return [];
      return auctionService.getAuctionMedia(auctionId);
    },
    enabled: Boolean(auctionId),
  });
}

export function useAuctionEvents(auctionId: string | undefined) {
  return useQuery({
    queryKey: ['auction-events', auctionId],
    queryFn: () => {
      if (!auctionId) return [];
      return auctionService.getEvents(auctionId);
    },
    enabled: Boolean(auctionId),
  });
}

export function usePlaceClick() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ auctionId }: { auctionId: string }) =>
      bidService.placeClick(auctionId),
    onSuccess: (result: PlaceClickResult, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction-detail', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auction', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
    },
  });
}

export function useUserAuctionHistory() {
  return useQuery({
    queryKey: ['user-auction-history'],
    queryFn: () => auctionService.getUserAuctionHistory(),
  });
}

export function useProcessDirectPurchase() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ auctionId }: { auctionId: string }) =>
      auctionService.processDirectPurchase(auctionId),
    onSuccess: (_result, variables) => {
      queryClient.invalidateQueries({ queryKey: ['auction-detail', variables.auctionId] });
      queryClient.invalidateQueries({ queryKey: ['auctions'] });
      queryClient.invalidateQueries({ queryKey: ['wallet'] });
      queryClient.invalidateQueries({ queryKey: ['user-auction-history'] });
    },
  });
}
