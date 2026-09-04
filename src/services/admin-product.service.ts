import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  AdminProductListItem,
  AdminProductDetail,
  CreateProductInput,
  UpdateProductInput,
  ProductStatus,
  RpcResult,
  RpcIdResult,
  ApiError,
} from '@/types';

interface ListRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: string;
  category_id: string;
  category_name: string | null;
  brand_id: string | null;
  brand_name: string | null;
  is_published: boolean;
  is_active: boolean;
  sort_order: number;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
  total_count: string;
}

interface DetailRow {
  id: string;
  name: string;
  slug: string;
  sku: string | null;
  status: string;
  category_id: string;
  category_name: string | null;
  brand_id: string | null;
  brand_name: string | null;
  short_description: string | null;
  description: string | null;
  seller_id: string | null;
  producer_id: string | null;
  is_published: boolean;
  is_active: boolean;
  is_new: boolean;
  is_selected: boolean;
  is_economic: boolean;
  is_best_seller: boolean;
  is_popular: boolean;
  is_special_offer: boolean;
  is_discounted: boolean;
  sort_order: number;
  publish_at: string | null;
  created_at: string;
  updated_at: string;
}

function mapListItem(row: ListRow): AdminProductListItem {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    status: row.status as ProductStatus,
    categoryId: row.category_id,
    categoryName: row.category_name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    isPublished: row.is_published,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    publishAt: row.publish_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapDetail(row: DetailRow): AdminProductDetail {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    status: row.status as ProductStatus,
    categoryId: row.category_id,
    categoryName: row.category_name,
    brandId: row.brand_id,
    brandName: row.brand_name,
    shortDescription: row.short_description,
    description: row.description,
    sellerId: row.seller_id,
    producerId: row.producer_id,
    isPublished: row.is_published,
    isActive: row.is_active,
    isNew: row.is_new,
    isSelected: row.is_selected,
    isEconomic: row.is_economic,
    isBestSeller: row.is_best_seller,
    isPopular: row.is_popular,
    isSpecialOffer: row.is_special_offer,
    isDiscounted: row.is_discounted,
    sortOrder: row.sort_order,
    publishAt: row.publish_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AdminProductService extends BaseService {
  async listProducts(params?: {
    search?: string;
    status?: string;
    categoryId?: string;
    brandId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ items: AdminProductListItem[]; total: number }> {
    const { data, error } = await this.client.rpc('admin_list_products', {
      p_search: params?.search ?? null,
      p_status: params?.status ?? null,
      p_category_id: params?.categoryId ?? null,
      p_brand_id: params?.brandId ?? null,
      p_limit: params?.limit ?? 50,
      p_offset: params?.offset ?? 0,
    });

    if (error) throw normalizeError(error);

    const rows = (data as ListRow[]) ?? [];
    const total = rows.length > 0 ? parseInt(rows[0].total_count, 10) : 0;
    return { items: rows.map(mapListItem), total };
  }

  async getProduct(productId: string): Promise<AdminProductDetail | null> {
    const { data, error } = await this.client.rpc('admin_get_product', {
      p_product_id: productId,
    });

    if (error) throw normalizeError(error);

    const rows = (data as DetailRow[]) ?? [];
    if (rows.length === 0) return null;
    return mapDetail(rows[0]);
  }

  async createProduct(input: CreateProductInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_product', {
      p_name: input.name,
      p_slug: input.slug,
      p_category_id: input.categoryId,
      p_sku: input.sku ?? null,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_brand_id: input.brandId ?? null,
      p_status: input.status ?? 'draft',
      p_sort_order: input.sortOrder ?? 0,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcIdResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد محصول' } as ApiError;
    }

    return result.product_id!;
  }

  async updateProduct(productId: string, input: UpdateProductInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_product', {
      p_product_id: productId,
      p_name: input.name ?? null,
      p_slug: input.slug ?? null,
      p_category_id: input.categoryId ?? null,
      p_sku: input.sku ?? null,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_brand_id: input.brandId ?? null,
      p_sort_order: input.sortOrder ?? null,
      p_is_new: input.isNew ?? null,
      p_is_selected: input.isSelected ?? null,
      p_is_economic: input.isEconomic ?? null,
      p_is_best_seller: input.isBestSeller ?? null,
      p_is_popular: input.isPopular ?? null,
      p_is_special_offer: input.isSpecialOffer ?? null,
      p_is_discounted: input.isDiscounted ?? null,
      p_is_active: input.isActive ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش محصول' } as ApiError;
    }
  }

  async transitionStatus(productId: string, newStatus: ProductStatus): Promise<void> {
    const { data, error } = await this.client.rpc('admin_transition_product_status', {
      p_product_id: productId,
      p_new_status: newStatus,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تغییر وضعیت' } as ApiError;
    }
  }

  async publishProduct(productId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_publish_product', {
      p_product_id: productId,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در انتشار' } as ApiError;
    }
  }

  async setPublishAt(productId: string, publishAt: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_set_product_publish_at', {
      p_product_id: productId,
      p_publish_at: publishAt,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تنظیم زمان انتشار' } as ApiError;
    }
  }

  async deleteProduct(productId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_product', {
      p_product_id: productId,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف محصول' } as ApiError;
    }
  }

  async bulkTransitionStatus(productIds: string[], newStatus: ProductStatus): Promise<number> {
    const { data, error } = await this.client.rpc('admin_bulk_transition_product_status', {
      p_product_ids: productIds,
      p_new_status: newStatus,
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string; affected_count: number };
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تغییر وضعیت گروهی' } as ApiError;
    }

    return result.affected_count;
  }

  async previewProduct(productId: string): Promise<AdminProductDetail | null> {
    const { data, error } = await this.client.rpc('admin_preview_product', {
      p_product_id: productId,
    });

    if (error) throw normalizeError(error);

    const rows = (data as DetailRow[]) ?? [];
    if (rows.length === 0) return null;
    return mapDetail(rows[0]);
  }
}

export const adminProductService = new AdminProductService();
