import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  BusinessCategoryWithActive,
  BusinessAdminRow,
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
    status: string;
    is_featured: boolean;
    display_order: number;
    logo_path: string | null;
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
    logoPath: row.logo_path,
    coverPath: null,
    isFeatured: row.is_featured,
    status: row.status as BusinessAdminRow['status'],
    displayOrder: row.display_order,
    createdAt: row.created_at,
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
    });

    if (error) throw normalizeError(error);

    const result = data as AdminMutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش کسب‌وکار' } as ApiError;
    }
  }
}

export const adminBusinessService = new AdminBusinessService();
