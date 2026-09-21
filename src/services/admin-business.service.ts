import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  BusinessCategoryWithActive,
  BusinessAdminRow,
  BusinessImage,
  CreateBusinessInput,
  UpdateBusinessInput,
  ApiError,
} from '@/types';

interface AdminCategoriesResult {
  success: boolean;
  error?: string;
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_name: string | null;
    display_order: number;
    is_active: boolean;
  }>;
}

interface AdminListResult {
  success: boolean;
  error?: string;
  businesses?: Array<{
    id: string;
    name: string;
    slug: string;
    short_description: string | null;
    category_id: string;
    category_name: string;
    category_slug: string;
    city: string | null;
    locality: string | null;
    province_id: string | null;
    province_name: string | null;
    city_id: string | null;
    city_name: string | null;
    status: string;
    is_featured: boolean;
    display_order: number;
    logo_path: string | null;
    cover_path: string | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
  }>;
}

interface AdminMutationResult {
  success: boolean;
  error?: string;
  business_id?: string;
}

function mapCategoryWithActive(row: AdminCategoriesResult['categories'] extends (infer T)[] | undefined ? T : never): BusinessCategoryWithActive {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    iconName: row.icon_name,
    displayOrder: row.display_order,
    isActive: row.is_active,
  };
}

function mapAdminRow(row: AdminListResult['businesses'] extends (infer T)[] | undefined ? T : never): BusinessAdminRow {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    city: row.city,
    locality: row.locality,
    provinceId: row.province_id,
    provinceName: row.province_name,
    cityId: row.city_id,
    cityName: row.city_name,
    logoPath: row.logo_path,
    coverPath: row.cover_path ?? null,
    isFeatured: row.is_featured,
    status: row.status as BusinessAdminRow['status'],
    displayOrder: row.display_order,
    createdAt: row.created_at,
    startDate: row.start_date,
    endDate: row.end_date,
  };
}

export class AdminBusinessService extends BaseService {
  async getAllCategories(): Promise<BusinessCategoryWithActive[]> {
    const { data, error } = await this.client.rpc('admin_list_all_categories');

    if (error) throw normalizeError(error);

    const result = data as AdminCategoriesResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت دسته‌بندی‌ها' } as ApiError;
    }

    return (result.categories ?? []).map(mapCategoryWithActive);
  }

  async listBusinesses(params: {
    status?: string | null;
    categoryId?: string | null;
    search?: string | null;
  } = {}): Promise<BusinessAdminRow[]> {
    const { data, error } = await this.client.rpc('admin_list_businesses', {
      p_status: params.status ?? null,
      p_category_id: params.categoryId ?? null,
      p_search: params.search ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as AdminListResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت کسب‌وکارها' } as ApiError;
    }

    return (result.businesses ?? []).map(mapAdminRow);
  }

  async create(input: CreateBusinessInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_business', {
      p_name: input.name,
      p_slug: input.slug,
      p_category_id: input.categoryId,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_city: input.city ?? null,
      p_locality: input.locality ?? null,
      p_address: input.address ?? null,
      p_phone: input.phone ?? null,
      p_website: input.website ?? null,
      p_logo_path: input.logoPath ?? null,
      p_cover_path: input.coverPath ?? null,
      p_status: input.status ?? 'pending',
      p_is_featured: input.isFeatured ?? false,
      p_display_order: input.displayOrder ?? 0,
      p_start_date: input.startDate ?? null,
      p_end_date: input.endDate ?? null,
      p_province_id: input.provinceId ?? null,
      p_city_id: input.cityId ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as AdminMutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد کسب‌وکار' } as ApiError;
    }

    return result.business_id!;
  }

  async update(businessId: string, input: UpdateBusinessInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_business', {
      p_business_id: businessId,
      p_name: input.name ?? null,
      p_slug: input.slug ?? null,
      p_category_id: input.categoryId ?? null,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_city: input.city ?? null,
      p_locality: input.locality ?? null,
      p_address: input.address ?? null,
      p_phone: input.phone ?? null,
      p_website: input.website ?? null,
      p_logo_path: input.logoPath ?? null,
      p_cover_path: input.coverPath ?? null,
      p_status: input.status ?? null,
      p_is_featured: input.isFeatured ?? null,
      p_display_order: input.displayOrder ?? null,
      p_start_date: input.startDate ?? null,
      p_end_date: input.endDate ?? null,
      p_clear_start_date: input.clearStartDate ?? false,
      p_clear_end_date: input.clearEndDate ?? false,
      p_province_id: input.provinceId ?? null,
      p_city_id: input.cityId ?? null,
      p_clear_province: input.clearProvince ?? false,
      p_clear_city: input.clearCity ?? false,
    });

    if (error) throw normalizeError(error);

    const result = data as AdminMutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش کسب‌وکار' } as ApiError;
    }
  }

  async delete(businessId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_business', {
      p_business_id: businessId,
    });

    if (error) throw normalizeError(error);

    const result = data as AdminMutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف کسب‌وکار' } as ApiError;
    }
  }

  async listImages(businessId: string): Promise<BusinessImage[]> {
    const { data, error } = await this.client.rpc('admin_list_business_images', {
      p_business_id: businessId,
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string; images?: Array<{ id: string; image_path: string; sort_order: number }> };
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت تصاویر' } as ApiError;
    }

    return (result.images ?? []).map((img) => ({
      id: img.id,
      imagePath: img.image_path,
      sortOrder: img.sort_order,
    }));
  }

  async addImage(businessId: string, imagePath: string): Promise<string> {
    const { data, error } = await this.client.rpc('admin_add_business_image', {
      p_business_id: businessId,
      p_image_path: imagePath,
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string; image_id?: string };
    if (!result.success) {
      throw { message: result.error ?? 'خطا در افزودن تصویر' } as ApiError;
    }

    return result.image_id!;
  }

  async deleteImage(imageId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_business_image', {
      p_image_id: imageId,
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف تصویر' } as ApiError;
    }
  }

  async listProvinces(): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await this.client
      .from('provinces')
      .select('id, name')
      .order('name');

    if (error) throw normalizeError(error);
    return data ?? [];
  }

  async listCities(provinceId: string): Promise<Array<{ id: string; name: string }>> {
    const { data, error } = await this.client
      .from('cities')
      .select('id, name')
      .eq('province_id', provinceId)
      .order('name');

    if (error) throw normalizeError(error);
    return data ?? [];
  }

  async createCategory(input: {
    name: string;
    slug: string;
    description?: string | null;
    iconName?: string | null;
    displayOrder?: number;
    isActive?: boolean;
  }): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_business_category', {
      p_name: input.name,
      p_slug: input.slug,
      p_description: input.description ?? null,
      p_icon_name: input.iconName ?? null,
      p_display_order: input.displayOrder ?? 0,
      p_is_active: input.isActive ?? true,
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string; category_id?: string };
    if (!result.success || !result.category_id) {
      throw { message: result.error ?? 'خطا در ایجاد دسته‌بندی' } as ApiError;
    }

    return result.category_id;
  }

  async updateCategory(categoryId: string, input: {
    name?: string | null;
    slug?: string | null;
    description?: string | null;
    iconName?: string | null;
    displayOrder?: number | null;
    isActive?: boolean | null;
  }): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_business_category', {
      p_category_id: categoryId,
      p_name: input.name ?? null,
      p_slug: input.slug ?? null,
      p_description: input.description ?? null,
      p_icon_name: input.iconName ?? null,
      p_display_order: input.displayOrder ?? null,
      p_is_active: input.isActive ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش دسته‌بندی' } as ApiError;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_business_category', {
      p_category_id: categoryId,
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف دسته‌بندی' } as ApiError;
    }
  }

  async reorderCategories(items: Array<{ id: string; display_order: number }>): Promise<void> {
    const { data, error } = await this.client.rpc('admin_reorder_business_categories', {
      p_items: JSON.stringify(items),
    });

    if (error) throw normalizeError(error);

    const result = data as { success: boolean; error?: string };
    if (!result.success) {
      throw { message: result.error ?? 'خطا در مرتب‌سازی دسته‌بندی‌ها' } as ApiError;
    }
  }
}

export const adminBusinessService = new AdminBusinessService();
