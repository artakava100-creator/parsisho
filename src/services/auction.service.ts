import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { Auction, AuctionEvent, ApiError, AuctionDetail, BidHistoryEntry, LastFiveClicker, AuctionHistoryEntry, DirectPurchaseResult } from '@/types';

interface AuctionRow {
  id: string;
  title: string;
  slug: string;
  description: string;
  status: string;
  auction_date: string;
  starts_at: string;
  ends_at: string;
  starting_price: number;
  current_price: number;
  min_bid_increment: number;
  bid_count: number;
  participant_count: number;
  winner_user_id: string | null;
  image_url: string | null;
  product_name: string | null;
  is_official: boolean;
  extension_used: boolean;
  extension_triggered_at: string | null;
  original_ends_at: string | null;
  actual_start_at: string | null;
  actual_end_at: string | null;
  created_at: string;
  updated_at: string;
  original_price: number | null;
  click_increment: number;
  click_cost: number;
  click_count: number;
}

function mapAuction(row: AuctionRow): Auction {
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status as Auction['status'],
    auctionDate: row.auction_date,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    startingPrice: row.starting_price,
    currentPrice: row.current_price,
    minBidIncrement: row.min_bid_increment,
    bidCount: row.bid_count,
    participantCount: row.participant_count,
    winnerUserId: row.winner_user_id,
    imageUrl: row.image_url,
    productName: row.product_name,
    isOfficial: row.is_official,
    extensionUsed: row.extension_used,
    extensionTriggeredAt: row.extension_triggered_at,
    originalEndsAt: row.original_ends_at,
    actualStartAt: row.actual_start_at,
    actualEndAt: row.actual_end_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    originalPrice: row.original_price,
    clickIncrement: row.click_increment,
    clickCost: row.click_cost,
    clickCount: row.click_count,
  };
}

export class AuctionService extends BaseService {
  async getAll(): Promise<Auction[]> {
    const { data, error } = await this.client
      .from('auctions')
      .select('*')
      .order('auction_date', { ascending: false });

    if (error) throw normalizeError(error);
    return (data as AuctionRow[]).map(mapAuction);
  }

  async getBySlug(slug: string): Promise<Auction | null> {
    const { data, error } = await this.client
      .from('auctions')
      .select('*')
      .eq('slug', slug)
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapAuction(data as AuctionRow);
  }

  async getById(id: string): Promise<Auction | null> {
    const { data, error } = await this.client
      .from('auctions')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapAuction(data as AuctionRow);
  }

  async getDetail(id: string): Promise<AuctionDetail | null> {
    const { data, error } = await this.client.rpc('get_auction_detail', {
      p_auction_id: id,
    });

    if (error) throw normalizeError(error);
    if (!data || !(data as Record<string, unknown>).success) {
      const errMsg = (data as Record<string, unknown>)?.error as string | undefined;
      if (errMsg) throw { message: errMsg } as ApiError;
      return null;
    }

    const result = data as Record<string, unknown>;
    const auctionData = result.auction as Record<string, unknown>;
    return {
      auction: mapAuction(auctionData as unknown as AuctionRow),
      bids: result.bids as unknown[] as BidHistoryEntry[],
      lastFiveClickers: ((result.last_five_clickers as Record<string, unknown>[]) || []).map((r) => ({
        userId: r.user_id as string,
        displayName: r.display_name as string,
        avatarUrl: (r.avatar_url as string | null) ?? null,
        lastClickAt: r.last_click_at as string,
        isOwn: r.is_own as boolean,
      })) as LastFiveClicker[],
      userClickCount: result.user_click_count as number || 0,
      userTotalSpent: result.user_total_spent as number || 0,
      userLastClick: (result.user_last_click as string | null) || null,
      serverTime: result.server_time as string,
    };
  }

  async getServerTime(): Promise<{ serverTime: string; iranTime: string }> {
    const { data, error } = await this.client.rpc('get_server_time');
    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    return {
      serverTime: result.server_time as string,
      iranTime: result.iran_time as string,
    };
  }

  async getEvents(auctionId: string): Promise<AuctionEvent[]> {
    const { data, error } = await this.client
      .from('auction_events')
      .select('*')
      .eq('auction_id', auctionId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw normalizeError(error);
    return (data as unknown[]).map((row) => {
      const r = row as Record<string, unknown>;
      return {
        id: r.id as string,
        auctionId: r.auction_id as string,
        eventType: r.event_type as AuctionEvent['eventType'],
        actorId: r.actor_id as string | null,
        metadata: r.metadata as Record<string, unknown>,
        createdAt: r.created_at as string,
      };
    });
  }

  async getUserAuctionHistory(): Promise<AuctionHistoryEntry[]> {
    const { data, error } = await this.client.rpc('get_user_auction_history');
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    if (!result.success) {
      const errMsg = result.error as string | undefined;
      if (errMsg) throw { message: errMsg } as ApiError;
      return [];
    }
    const rows = (result.history as Record<string, unknown>[]) || [];
    return rows.map((r) => ({
      auctionId: r.auction_id as string,
      title: r.title as string,
      productName: r.product_name as string | null,
      imageUrl: r.image_url as string | null,
      status: r.status as AuctionHistoryEntry['status'],
      auctionDate: r.auction_date as string,
      currentPrice: r.current_price as number,
      originalPrice: r.original_price as number | null,
      clickCost: r.click_cost as number,
      clickIncrement: r.click_increment as number,
      userClickCount: r.user_click_count as number,
      userTotalSpent: r.user_total_spent as number,
      winnerUserId: r.winner_user_id as string | null,
      winnerName: r.winner_name as string | null,
      isWinner: r.is_winner as boolean,
      endsAt: r.ends_at as string,
    }));
  }

  async processDirectPurchase(auctionId: string): Promise<DirectPurchaseResult> {
    const { data, error } = await this.client.rpc('process_direct_purchase', {
      p_auction_id: auctionId,
    });
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    return {
      success: result.success as boolean,
      error: result.error as string | undefined,
      auctionId: result.auction_id as string | undefined,
      originalPrice: result.original_price as number | undefined,
      credit: result.credit as number | undefined,
      remaining: result.remaining as number | undefined,
      newBalance: result.new_balance as number | undefined,
    };
  }
}

export const auctionService = new AuctionService();
