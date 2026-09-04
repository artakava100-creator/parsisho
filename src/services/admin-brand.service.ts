import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  ProductBrand,
  CreateBrandInput,
  UpdateBrandInput,
  RpcResult,
  RpcIdResult,
  ApiError,
} from '@/types';

interface BrandRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  sort_order: number;
  product_count: string;
  created_at: string;
  updated_at: string;
}

function mapBrand(row: BrandRow): ProductBrand {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    productCount: parseInt(row.product_count, 10),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AdminBrandService extends BaseService {
  async listBrands(): Promise<ProductBrand[]> {
    const { data, error } = await this.client.rpc('admin_list_brands');
    if (error) throw normalizeError(error);
    return ((data as BrandRow[]) ?? []).map(mapBrand);
  }

  async createBrand(input: CreateBrandInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_brand', {
      p_name: input.name,
      p_slug: input.slug,
      p_description: input.description ?? null,
      p_sort_order: input.sortOrder ?? 0,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcIdResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد برند' } as ApiError;
    }

    return result.brand_id!;
  }

  async updateBrand(brandId: string, input: UpdateBrandInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_brand', {
      p_brand_id: brandId,
      p_name: input.name ?? null,
      p_slug: input.slug ?? null,
      p_description: input.description ?? null,
      p_is_active: input.isActive ?? null,
      p_sort_order: input.sortOrder ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش برند' } as ApiError;
    }
  }

  async deleteBrand(brandId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_brand', {
      p_brand_id: brandId,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف برند' } as ApiError;
    }
  }

  async reorderBrands(orderedIds: { id: string; displayOrder: number }[]): Promise<void> {
    const { data, error } = await this.client.rpc('admin_reorder_brands', {
      p_ordered_ids: orderedIds.map((item) => ({ id: item.id, display_order: item.displayOrder })),
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ترتیب‌بندی' } as ApiError;
    }
  }
}

export const adminBrandService = new AdminBrandService();
