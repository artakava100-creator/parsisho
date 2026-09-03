import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { Auction } from '@/types';

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

export interface CreateAuctionInput {
  title: string;
  slug: string;
  auctionDate: string;
  startsAt: string;
  endsAt: string;
  startingPrice: number;
  description?: string;
  minBidIncrement?: number;
  isOfficial?: boolean;
  imageUrl?: string;
  productName?: string;
  originalPrice?: number;
  clickIncrement?: number;
  clickCost?: number;
}

export interface UpdateAuctionInput {
  title?: string;
  description?: string;
  imageUrl?: string;
  productName?: string;
  originalPrice?: number;
  clickIncrement?: number;
  clickCost?: number;
}

interface AdminRpcResult {
  success: boolean;
  error?: string;
  auction_id?: string;
}

export class AdminAuctionService extends BaseService {
  async getAll(): Promise<Auction[]> {
    const { data, error } = await this.client
      .from('auctions')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw normalizeError(error);
    return (data as AuctionRow[]).map(mapAuction);
  }

  async create(input: CreateAuctionInput): Promise<string> {
    const { data, error } = await this.client.rpc('create_auction', {
      p_title: input.title,
      p_slug: input.slug,
      p_auction_date: input.auctionDate,
      p_starts_at: input.startsAt,
      p_ends_at: input.endsAt,
      p_starting_price: input.startingPrice,
      p_description: input.description ?? '',
      p_min_bid_increment: input.minBidIncrement ?? 100000,
      p_is_official: input.isOfficial ?? true,
      p_image_url: input.imageUrl ?? null,
      p_product_name: input.productName ?? null,
      p_original_price: input.originalPrice ?? null,
      p_click_increment: input.clickIncrement ?? null,
      p_click_cost: input.clickCost ?? null,
    });

    if (error) throw normalizeError(error);
    const result = data as AdminRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
    return result.auction_id!;
  }

  async update(auctionId: string, input: UpdateAuctionInput): Promise<void> {
    const { data, error } = await this.client.rpc('update_auction', {
      p_auction_id: auctionId,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_image_url: input.imageUrl ?? null,
      p_product_name: input.productName ?? null,
      p_original_price: input.originalPrice ?? null,
      p_click_increment: input.clickIncrement ?? null,
      p_click_cost: input.clickCost ?? null,
    });

    if (error) throw normalizeError(error);
    const result = data as AdminRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
  }

  async schedule(auctionId: string): Promise<void> {
    const { data, error } = await this.client.rpc('set_auction_scheduled', {
      p_auction_id: auctionId,
    });

    if (error) throw normalizeError(error);
    const result = data as AdminRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
  }

  async goLive(auctionId: string): Promise<void> {
    const { data, error } = await this.client.rpc('set_auction_live', {
      p_auction_id: auctionId,
    });

    if (error) throw normalizeError(error);
    const result = data as AdminRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
  }

  async cancel(auctionId: string): Promise<void> {
    const { data, error } = await this.client.rpc('cancel_auction', {
      p_auction_id: auctionId,
    });

    if (error) throw normalizeError(error);
    const result = data as AdminRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
  }

  async finalize(auctionId: string): Promise<void> {
    const { data, error } = await this.client.rpc('finalize_auction', {
      p_auction_id: auctionId,
    });

    if (error) throw normalizeError(error);
    const result = data as AdminRpcResult;
    if (!result.success) throw { message: result.error } as { message: string };
  }
}

export const adminAuctionService = new AdminAuctionService();
