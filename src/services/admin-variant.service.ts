import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  ProductVariant,
  CreateVariantInput,
  UpdateVariantInput,
  RpcResult,
  RpcIdResult,
  ApiError,
} from '@/types';

interface VariantRow {
  id: string;
  product_id: string;
  sku: string | null;
  name: string;
  attributes: Record<string, unknown>;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

function mapVariant(row: VariantRow): ProductVariant {
  return {
    id: row.id,
    productId: row.product_id,
    sku: row.sku,
    name: row.name,
    attributes: row.attributes,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AdminVariantService extends BaseService {
  async listVariants(productId: string): Promise<ProductVariant[]> {
    const { data, error } = await this.client.rpc('admin_list_variants', {
      p_product_id: productId,
    });
    if (error) throw normalizeError(error);
    return ((data as VariantRow[]) ?? []).map(mapVariant);
  }

  async createVariant(input: CreateVariantInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_variant', {
      p_product_id: input.productId,
      p_name: input.name,
      p_attributes: input.attributes ?? {},
      p_sku: input.sku ?? null,
      p_sort_order: input.sortOrder ?? 0,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcIdResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد تنوع' } as ApiError;
    }

    return result.variant_id!;
  }

  async updateVariant(variantId: string, input: UpdateVariantInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_variant', {
      p_variant_id: variantId,
      p_name: input.name ?? null,
      p_sku: input.sku ?? null,
      p_attributes: input.attributes ?? null,
      p_is_active: input.isActive ?? null,
      p_sort_order: input.sortOrder ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش تنوع' } as ApiError;
    }
  }

  async deleteVariant(variantId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_variant', {
      p_variant_id: variantId,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف تنوع' } as ApiError;
    }
  }

  async reorderVariants(orderedIds: { id: string; displayOrder: number }[]): Promise<void> {
    const { data, error } = await this.client.rpc('admin_reorder_variants', {
      p_ordered_ids: orderedIds.map((item) => ({ id: item.id, display_order: item.displayOrder })),
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ترتیب‌بندی' } as ApiError;
    }
  }
}

export const adminVariantService = new AdminVariantService();
