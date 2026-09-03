import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { PlaceClickResult, BidHistoryEntry } from '@/types';

export class BidService extends BaseService {
  async placeClick(auctionId: string): Promise<PlaceClickResult> {
    const { data, error } = await this.client.rpc('place_click', {
      p_auction_id: auctionId,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      return {
        success: false,
        error: result.error as string,
        currentPrice: result.current_price as number | undefined,
        clickCount: result.click_count as number | undefined,
        clickCost: result.click_cost as number | undefined,
      };
    }

    return {
      success: true,
      auctionId: result.auction_id as string,
      newCurrentPrice: result.new_current_price as number,
      newClickCount: result.new_click_count as number,
      clickSequence: result.click_sequence as number,
      clickCost: result.click_cost as number,
      extensionApplied: result.extension_applied as boolean | undefined,
      newEndsAt: result.new_ends_at as string | undefined,
      newBalance: result.new_balance as number | undefined,
    };
  }

  async getBidHistory(auctionId: string): Promise<BidHistoryEntry[]> {
    const { data, error } = await this.client.rpc('get_auction_detail', {
      p_auction_id: auctionId,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) return [];

    return result.bids as BidHistoryEntry[];
  }

  subscribeToAuction(
    auctionId: string,
    callback: (payload: { eventType: string; table: string; new?: Record<string, unknown>; old?: Record<string, unknown> }) => void,
  ) {
    return this.client
      .channel(`auction-${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `auction_id=eq.${auctionId}` },
        (payload) => callback({ ...payload, eventType: 'INSERT', table: 'bids' }),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'auctions', filter: `id=eq.${auctionId}` },
        (payload) => callback({ ...payload, eventType: 'UPDATE', table: 'auctions' }),
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'auction_events', filter: `auction_id=eq.${auctionId}` },
        (payload) => callback({ ...payload, eventType: 'INSERT', table: 'auction_events' }),
      )
      .subscribe();
  }
}

export const bidService = new BidService();
