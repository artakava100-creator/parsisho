import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  SpecialItem,
  CreateSpecialItemInput,
  UpdateSpecialItemInput,
  ApiError,
} from '@/types';

interface ListResult {
  success: boolean;
  error?: string;
  items?: Array<{
    id: string;
    title: string;
    description: string | null;
    icon: string;
    image_url: string | null;
    destination_url: string;
    display_order: number;
    is_published: boolean;
    is_enabled: boolean;
    created_at: string;
    updated_at: string;
  }>;
}

interface MutationResult {
  success: boolean;
  error?: string;
  item_id?: string;
}

interface PublicListResult {
  success: boolean;
  error?: string;
  items?: Array<{
    id: string;
    title: string;
    description: string | null;
    icon: string;
    image_url: string | null;
    destination_url: string;
    display_order: number;
  }>;
}

function mapItem(row: ListResult['items'] extends (infer T)[] | undefined ? T : never): SpecialItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    imageUrl: row.image_url,
    destinationUrl: row.destination_url,
    displayOrder: row.display_order,
    isPublished: row.is_published,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface PublicSpecialItem {
  id: string;
  title: string;
  description: string | null;
  icon: string;
  imageUrl: string | null;
  destinationUrl: string;
  displayOrder: number;
}

function mapPublicItem(row: PublicListResult['items'] extends (infer T)[] | undefined ? T : never): PublicSpecialItem {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    icon: row.icon,
    imageUrl: row.image_url,
    destinationUrl: row.destination_url,
    displayOrder: row.display_order,
  };
}

export class AdminSpecialService extends BaseService {
  async listItems(): Promise<SpecialItem[]> {
    const { data, error } = await this.client.rpc('admin_list_special_items');
    if (error) throw normalizeError(error);

    const result = data as ListResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت آیتم‌ها' } as ApiError;
    }

    return (result.items ?? []).map(mapItem);
  }

  async createItem(input: CreateSpecialItemInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_special_item', {
      p_title: input.title,
      p_description: input.description ?? null,
      p_icon: input.icon ?? 'sparkles',
      p_image_url: input.imageUrl ?? null,
      p_destination_url: input.destinationUrl,
      p_display_order: input.displayOrder ?? 0,
      p_is_published: input.isPublished ?? true,
      p_is_enabled: input.isEnabled ?? true,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد آیتم' } as ApiError;
    }

    return result.item_id!;
  }

  async updateItem(itemId: string, input: UpdateSpecialItemInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_special_item', {
      p_item_id: itemId,
      p_title: input.title ?? null,
      p_description: input.description ?? null,
      p_icon: input.icon ?? null,
      p_image_url: input.imageUrl ?? null,
      p_destination_url: input.destinationUrl ?? null,
      p_display_order: input.displayOrder ?? null,
      p_is_published: input.isPublished ?? null,
      p_is_enabled: input.isEnabled ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش آیتم' } as ApiError;
    }
  }

  async deleteItem(itemId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_special_item', {
      p_item_id: itemId,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف آیتم' } as ApiError;
    }
  }

  async reorderItems(orderedIds: { id: string; displayOrder: number }[]): Promise<void> {
    const { data, error } = await this.client.rpc('admin_reorder_special_items', {
      p_ordered_ids: orderedIds.map((item) => ({ id: item.id, display_order: item.displayOrder })),
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ترتیب‌بندی' } as ApiError;
    }
  }

  async toggleItem(itemId: string, isEnabled: boolean): Promise<void> {
    const { data, error } = await this.client.rpc('admin_toggle_special_item', {
      p_item_id: itemId,
      p_is_enabled: isEnabled,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تغییر وضعیت' } as ApiError;
    }
  }

  async duplicateItem(itemId: string): Promise<string> {
    const { data, error } = await this.client.rpc('admin_duplicate_special_item', {
      p_item_id: itemId,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تکثیر آیتم' } as ApiError;
    }

    return result.item_id!;
  }

  async getPublishedItems(limit: number): Promise<PublicSpecialItem[]> {
    const { data, error } = await this.client.rpc('get_published_special_items', {
      p_limit: limit,
    });

    if (error) throw normalizeError(error);

    const result = data as PublicListResult;
    if (!result.success) {
      return [];
    }

    return (result.items ?? []).map(mapPublicItem);
  }
}

export const adminSpecialService = new AdminSpecialService();
