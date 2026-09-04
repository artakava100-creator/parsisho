import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type {
  StorefrontSection,
  CreateStorefrontSectionInput,
  UpdateStorefrontSectionInput,
  StorefrontSectionType,
  StorefrontSectionStatus,
  StorefrontVisibility,
  ApiError,
} from '@/types';

interface ListResult {
  success: boolean;
  error?: string;
  sections?: Array<{
    id: string;
    section_key: string;
    title: string;
    subtitle: string | null;
    section_type: string;
    is_enabled: boolean;
    status: string;
    display_order: number;
    visibility: string;
    config: Record<string, unknown>;
    created_at: string;
    updated_at: string;
  }>;
}

interface MutationResult {
  success: boolean;
  error?: string;
  section_id?: string;
}

function mapSection(row: ListResult['sections'] extends (infer T)[] | undefined ? T : never): StorefrontSection {
  return {
    id: row.id,
    sectionKey: row.section_key,
    title: row.title,
    subtitle: row.subtitle,
    sectionType: row.section_type as StorefrontSectionType,
    isEnabled: row.is_enabled,
    status: row.status as StorefrontSectionStatus,
    displayOrder: row.display_order,
    visibility: row.visibility as StorefrontVisibility,
    config: row.config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class AdminStorefrontService extends BaseService {
  async listSections(): Promise<StorefrontSection[]> {
    const { data, error } = await this.client.rpc('admin_list_storefront_sections');
    if (error) throw normalizeError(error);

    const result = data as ListResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت بخش‌ها' } as ApiError;
    }

    return (result.sections ?? []).map(mapSection);
  }

  async createSection(input: CreateStorefrontSectionInput): Promise<string> {
    const { data, error } = await this.client.rpc('admin_create_storefront_section', {
      p_section_key: input.sectionKey,
      p_title: input.title,
      p_subtitle: input.subtitle ?? null,
      p_section_type: input.sectionType,
      p_is_enabled: input.isEnabled ?? true,
      p_status: input.status ?? 'active',
      p_display_order: input.displayOrder ?? 0,
      p_visibility: input.visibility ?? 'all',
      p_config: input.config ?? {},
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ایجاد بخش' } as ApiError;
    }

    return result.section_id!;
  }

  async updateSection(sectionId: string, input: UpdateStorefrontSectionInput): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_storefront_section', {
      p_section_id: sectionId,
      p_title: input.title ?? null,
      p_subtitle: input.subtitle ?? null,
      p_section_type: input.sectionType ?? null,
      p_is_enabled: input.isEnabled ?? null,
      p_status: input.status ?? null,
      p_display_order: input.displayOrder ?? null,
      p_visibility: input.visibility ?? null,
      p_config: input.config ?? null,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ویرایش بخش' } as ApiError;
    }
  }

  async deleteSection(sectionId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_storefront_section', {
      p_section_id: sectionId,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف بخش' } as ApiError;
    }
  }

  async reorderSections(orderedIds: { id: string; displayOrder: number }[]): Promise<void> {
    const { data, error } = await this.client.rpc('admin_reorder_storefront_sections', {
      p_ordered_ids: orderedIds.map((item) => ({ id: item.id, display_order: item.displayOrder })),
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ترتیب‌بندی بخش‌ها' } as ApiError;
    }
  }

  async toggleSection(sectionId: string, isEnabled: boolean): Promise<void> {
    const { data, error } = await this.client.rpc('admin_toggle_storefront_section', {
      p_section_id: sectionId,
      p_is_enabled: isEnabled,
    });

    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تغییر وضعیت بخش' } as ApiError;
    }
  }
}

export const adminStorefrontService = new AdminStorefrontService();
