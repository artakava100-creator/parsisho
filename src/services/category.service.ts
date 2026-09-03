import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { ProductCategory } from '@/types';

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

export class CategoryService extends BaseService {
  async getCategories(opts?: { parentId?: string | null; onlyNav?: boolean; onlyHome?: boolean }): Promise<ProductCategory[]> {
    let query = this.client
      .from('product_categories')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (opts?.parentId !== undefined) {
      if (opts.parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', opts.parentId);
      }
    }
    if (opts?.onlyNav) {
      query = query.eq('show_in_navigation', true);
    }
    if (opts?.onlyHome) {
      query = query.eq('show_on_home', true);
    }

    const { data, error } = await query;
    if (error) throw normalizeError(error);
    return (data as CategoryRow[]).map(mapCategory);
  }

  async getCategoryBySlug(slug: string): Promise<ProductCategory | null> {
    const { data, error } = await this.client
      .from('product_categories')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapCategory(data as CategoryRow);
  }

  async getCategoryById(id: string): Promise<ProductCategory | null> {
    const { data, error } = await this.client
      .from('product_categories')
      .select('*')
      .eq('id', id)
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw normalizeError(error);
    if (!data) return null;
    return mapCategory(data as CategoryRow);
  }
}

export const categoryService = new CategoryService();
