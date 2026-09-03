import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { Advertisement, AdSlot, ResolveAdResult, AdAnalytics, ApiError } from '@/types';

interface AdSlotRow {
  id: string;
  slot_key: string;
  page: string;
  placement: string;
  devices: string[];
  is_active: boolean;
}

interface AdvertisementRow {
  id: string;
  title: string;
  image_url: string;
  destination_url: string;
  is_active: boolean;
  priority: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  slot_ids?: string[];
}

function mapSlot(row: AdSlotRow): AdSlot {
  return {
    id: row.id,
    slotKey: row.slot_key,
    page: row.page,
    placement: row.placement,
    devices: row.devices,
    isActive: row.is_active,
  };
}

function mapAdvertisement(row: AdvertisementRow): Advertisement {
  return {
    id: row.id,
    title: row.title,
    imageUrl: row.image_url,
    destinationUrl: row.destination_url,
    isActive: row.is_active,
    priority: row.priority,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    slotIds: row.slot_ids,
  };
}

export class AdService extends BaseService {
  async getSlots(): Promise<AdSlot[]> {
    const { data, error } = await this.client
      .from('ad_slots')
      .select('*')
      .eq('is_active', true)
      .order('page', { ascending: true });

    if (error) throw normalizeError(error);
    return (data as AdSlotRow[]).map(mapSlot);
  }

  async resolveAdSlot(slotKey: string, device: string = 'desktop'): Promise<ResolveAdResult> {
    const { data, error } = await this.client.rpc('resolve_ad_slot', {
      p_slot_key: slotKey,
      p_device: device,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در دریافت تبلیغ' } as ApiError;
    }

    const adData = result.advertisement as AdvertisementRow | null;
    const slotData = result.slot as AdSlotRow | null;

    return {
      advertisement: adData ? mapAdvertisement(adData) : null,
      slot: slotData ? { id: slotData.id, slotKey: slotData.slot_key, page: slotData.page, placement: slotData.placement } : null,
    };
  }

  async trackEvent(advertisementId: string, adSlotId: string, eventType: 'impression' | 'click'): Promise<void> {
    const { error } = await this.client.rpc('track_ad_event', {
      p_advertisement_id: advertisementId,
      p_ad_slot_id: adSlotId,
      p_event_type: eventType,
    });
    if (error) {
      // Silently fail — analytics tracking should never break the UI
    }
  }

  // Admin methods
  async adminListAdvertisements(limit = 50, offset = 0): Promise<Advertisement[]> {
    const { data, error } = await this.client.rpc('admin_list_advertisements', {
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در دریافت تبلیغات' } as ApiError;
    }
    return (result.advertisements as AdvertisementRow[]).map(mapAdvertisement);
  }

  async adminCreateAdvertisement(params: {
    title: string;
    imageUrl: string;
    destinationUrl: string;
    isActive: boolean;
    priority: number;
    startsAt: string | null;
    endsAt: string | null;
    slotIds: string[] | null;
  }): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_advertisement', {
      p_title: params.title,
      p_image_url: params.imageUrl,
      p_destination_url: params.destinationUrl,
      p_is_active: params.isActive,
      p_priority: params.priority,
      p_starts_at: params.startsAt,
      p_ends_at: params.endsAt,
      p_slot_ids: params.slotIds,
    });
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در ایجاد تبلیغ' } as ApiError;
    }
    return result.advertisement_id as string;
  }

  async adminUpdateAdvertisement(params: {
    advertisementId: string;
    title?: string;
    imageUrl?: string;
    destinationUrl?: string;
    isActive?: boolean;
    priority?: number;
    startsAt?: string | null;
    endsAt?: string | null;
    setStartsNull?: boolean;
    setEndsNull?: boolean;
  }): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_advertisement', {
      p_advertisement_id: params.advertisementId,
      p_title: params.title ?? null,
      p_image_url: params.imageUrl ?? null,
      p_destination_url: params.destinationUrl ?? null,
      p_is_active: params.isActive ?? null,
      p_priority: params.priority ?? null,
      p_starts_at: params.startsAt ?? null,
      p_ends_at: params.endsAt ?? null,
      p_set_starts_null: params.setStartsNull ?? false,
      p_set_ends_null: params.setEndsNull ?? false,
    });
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در ویرایش تبلیغ' } as ApiError;
    }
  }

  async adminDeleteAdvertisement(advertisementId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_advertisement', {
      p_advertisement_id: advertisementId,
    });
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در حذف تبلیغ' } as ApiError;
    }
  }

  async adminSetAdSlots(advertisementId: string, slotIds: string[]): Promise<void> {
    const { data, error } = await this.client.rpc('admin_set_ad_slots', {
      p_advertisement_id: advertisementId,
      p_slot_ids: slotIds,
    });
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در تنظیم موقعیت' } as ApiError;
    }
  }

  async adminGetAnalytics(advertisementId?: string): Promise<AdAnalytics[]> {
    const { data, error } = await this.client.rpc('admin_get_ad_analytics', {
      p_advertisement_id: advertisementId ?? null,
    });
    if (error) throw normalizeError(error);
    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در دریافت آمار' } as ApiError;
    }
    const analytics = result.analytics as AdAnalytics[] | AdAnalytics;
    if (Array.isArray(analytics)) return analytics;
    return [analytics];
  }
}

export const adService = new AdService();
