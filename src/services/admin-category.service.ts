import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  ProductCategory,
  CreateCategoryInput,
  UpdateCategoryInput,
  RpcResult,
  RpcIdResult,
  ApiError,
} from '@/types';

interface CategoryRow {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  short_description: string | null;
  description: string | null;
  icon: string | null;
  image_url: string | null;
  banner_url: string | null;
  sort_order: number;
  is_active: boolean;
  show_on_home: boolean;
  show_in_navigation: boolean;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
}

function mapCategory(row: CategoryRow): ProductCategory {
  return {
    id: row.id,
    parentId: row.parent_id,
    name: row.name,
    slug: row.slug,
    shortDescription: row.short_description,
    description: row.description,
    icon: row.icon,
    imageUrl: row.image_url,
    bannerUrl: row.banner_url,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    showOnHome: row.show_on_home,
    showInNavigation: row.show_in_navigation,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AdminCategoryService extends BaseService {
  async listCategories(): Promise<ProductCategory[]> {
    const { data, error } = await this.client.rpc('admin_list_categories');
    if (error) throw normalizeError(error);
    return ((data as CategoryRow[]) ?? []).map(mapCategory);
  }

  async createCategory(input: CreateCategoryInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_category', {
      p_name: input.name,
      p_slug: input.slug,
      p_parent_id: input.parentId ?? null,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_icon: input.icon ?? null,
      p_sort_order: input.sortOrder ?? 0,
      p_is_active: input.isActive ?? true,
      p_show_on_home: input.showOnHome ?? true,
      p_show_in_navigation: input.showInNavigation ?? true,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcIdResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد دسته‌بندی' } as ApiError;
    }

    return result.category_id!;
  }

  async updateCategory(categoryId: string, input: UpdateCategoryInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_category', {
      p_category_id: categoryId,
      p_name: input.name ?? null,
      p_slug: input.slug ?? null,
      p_parent_id: input.parentId ?? null,
      p_short_description: input.shortDescription ?? null,
      p_description: input.description ?? null,
      p_icon: input.icon ?? null,
      p_sort_order: input.sortOrder ?? null,
      p_is_active: input.isActive ?? null,
      p_show_on_home: input.showOnHome ?? null,
      p_show_in_navigation: input.showInNavigation ?? null,
      p_seo_title: input.seoTitle ?? null,
      p_seo_description: input.seoDescription ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش دسته‌بندی' } as ApiError;
    }
  }

  async deleteCategory(categoryId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_category', {
      p_category_id: categoryId,
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف دسته‌بندی' } as ApiError;
    }
  }

  async reorderCategories(orderedIds: { id: string; displayOrder: number }[]): Promise<void> {
    const { data, error } = await this.client.rpc('admin_reorder_categories', {
      p_ordered_ids: orderedIds.map((item) => ({ id: item.id, display_order: item.displayOrder })),
    });

    if (error) throw normalizeError(error);

    const result = data as RpcResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ترتیب‌بندی' } as ApiError;
    }
  }
}

export const adminCategoryService = new AdminCategoryService();
