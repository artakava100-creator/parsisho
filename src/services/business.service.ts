import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { BusinessCategory, BusinessSummary, BusinessDetail, ApiError } from '@/types';

interface CategoriesResult {
  success: boolean;
  error?: string;
  categories?: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    icon_name: string | null;
    display_order: number;
  }>;
}

interface BusinessesResult {
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
    logo_path: string | null;
    cover_path: string | null;
    is_featured: boolean;
  }>;
  total?: number;
}

interface BusinessBySlugResult {
  success: boolean;
  error?: string;
  business?: {
    id: string;
    name: string;
    slug: string;
    short_description: string | null;
    description: string | null;
    category_id: string;
    category_name: string;
    category_slug: string;
    city: string | null;
    locality: string | null;
    address: string | null;
    phone: string | null;
    website: string | null;
    logo_path: string | null;
    cover_path: string | null;
    status: string;
    is_featured: boolean;
    created_at: string;
  };
}

function mapCategory(row: CategoriesResult['categories'] extends (infer T)[] | undefined ? T : never): BusinessCategory {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    iconName: row.icon_name,
    displayOrder: row.display_order,
  };
}

function mapBusinessSummary(row: BusinessesResult['businesses'] extends (infer T)[] | undefined ? T : never): BusinessSummary {
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
    coverPath: row.cover_path,
    isFeatured: row.is_featured,
  };
}

function mapBusinessDetail(row: NonNullable<BusinessBySlugResult['business']>): BusinessDetail {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    categoryId: row.category_id,
    categoryName: row.category_name,
    categorySlug: row.category_slug,
    city: row.city,
    locality: row.locality,
    address: row.address,
    phone: row.phone,
    website: row.website,
    logoPath: row.logo_path,
    coverPath: row.cover_path,
    status: row.status as BusinessDetail['status'],
    isFeatured: row.is_featured,
    createdAt: row.created_at,
  };
}

export interface BusinessQueryParams {
  categorySlug?: string | null;
  search?: string | null;
  city?: string | null;
  limit?: number;
  offset?: number;
}

export class BusinessService extends BaseService {
  async getCategories(): Promise<BusinessCategory[]> {
    const { data, error } = await this.client.rpc('get_business_categories');

    if (error) throw normalizeError(error);

    const result = data as CategoriesResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت دسته‌بندی‌ها' } as ApiError;
    }

    return (result.categories ?? []).map(mapCategory);
  }

  async getBusinesses(params: BusinessQueryParams = {}): Promise<{ businesses: BusinessSummary[]; total: number }> {
    const { data, error } = await this.client.rpc('get_businesses', {
      p_category_slug: params.categorySlug ?? null,
      p_search: params.search ?? null,
      p_city: params.city ?? null,
      p_limit: params.limit ?? 24,
      p_offset: params.offset ?? 0,
    });

    if (error) throw normalizeError(error);

    const result = data as BusinessesResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت کسب‌وکارها' } as ApiError;
    }

    return {
      businesses: (result.businesses ?? []).map(mapBusinessSummary),
      total: result.total ?? 0,
    };
  }

  async getBusinessBySlug(slug: string): Promise<BusinessDetail | null> {
    const { data, error } = await this.client.rpc('get_business_by_slug', {
      p_slug: slug,
    });

    if (error) throw normalizeError(error);

    const result = data as BusinessBySlugResult;
    if (!result.success || !result.business) {
      return null;
    }

    return mapBusinessDetail(result.business);
  }
}

export const businessService = new BusinessService();
