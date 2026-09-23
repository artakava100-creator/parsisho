import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import { env } from '@/config/env';
import type {
  BusinessSlide,
  BusinessSlideListItem,
  BusinessSlideDetail,
  BusinessSlideLayer,
  CreateBusinessSlideInput,
  UpdateBusinessSlideInput,
  CreateSlideLayerInput,
  UpdateSlideLayerInput,
} from '@/types';

interface RpcResult {
  success: boolean;
  error?: string;
  id?: string;
}

interface SlidesResult extends RpcResult {
  slides?: Array<Record<string, unknown>>;
}

interface SlideResult extends RpcResult {
  slide?: Record<string, unknown>;
  layers?: Array<Record<string, unknown>>;
}

function mapLayer(row: Record<string, unknown>): BusinessSlideLayer {
  return {
    id: row.id as string,
    layerType: row.layer_type as BusinessSlideLayer['layerType'],
    content: (row.content as string) ?? null,
    imagePath: (row.image_path as string) ?? null,
    linkUrl: (row.link_url as string) ?? null,
    positionX: (row.position_x as number) ?? 50,
    positionY: (row.position_y as number) ?? 50,
    width: (row.width as number | undefined) ?? null,
    zIndex: (row.z_index as number) ?? 0,
    animationDelayMs: (row.animation_delay_ms as number) ?? 0,
    animationType: (row.animation_type as BusinessSlideLayer['animationType']) ?? 'fade-slide',
    sortOrder: (row.sort_order as number) ?? 0,
    isVisible: (row.is_visible as boolean) ?? true,
    slideId: row.slide_id as string | undefined,
  };
}

function mapSlide(row: Record<string, unknown>): BusinessSlide {
  return {
    id: row.id as string,
    internalName: row.internal_name as string,
    title: (row.title as string) ?? null,
    eyebrow: (row.eyebrow as string) ?? null,
    description: (row.description as string) ?? null,
    ctaText: (row.cta_text as string) ?? null,
    ctaUrl: (row.cta_url as string) ?? null,
    cta2Text: (row.cta2_text as string) ?? null,
    cta2Url: (row.cta2_url as string) ?? null,
    backgroundImagePath: (row.background_image_path as string) ?? null,
    mainImagePath: (row.main_image_path as string) ?? null,
    mobileImagePath: (row.mobile_image_path as string) ?? null,
    overlayOpacity: (row.overlay_opacity as number) ?? 40,
    contentPosition: (row.content_position as BusinessSlide['contentPosition']) ?? 'right',
    textColor: (row.text_color as BusinessSlide['textColor']) ?? 'light',
    animationType: (row.animation_type as BusinessSlide['animationType']) ?? 'fade-slide',
    durationMs: (row.duration_ms as number) ?? 6000,
    transitionMs: (row.transition_ms as number) ?? 600,
    sortOrder: (row.sort_order as number) ?? 0,
    linkType: (row.link_type as BusinessSlide['linkType']) ?? 'none',
    linkBusinessId: (row.link_business_id as string | null) ?? null,
    linkCategoryId: (row.link_category_id as string | null) ?? null,
    linkCustomUrl: (row.link_custom_url as string) ?? null,
    layers: [],
  };
}

function mapSlideListItem(row: Record<string, unknown>): BusinessSlideListItem {
  return {
    ...mapSlide(row),
    isActive: (row.is_active as boolean) ?? true,
    isPublished: (row.is_published as boolean) ?? false,
    startsAt: (row.starts_at as string | null) ?? null,
    endsAt: (row.ends_at as string | null) ?? null,
    layerCount: (row.layer_count as number) ?? 0,
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
  };
}

function mapSlideDetail(row: Record<string, unknown>, layers: Array<Record<string, unknown>>): BusinessSlideDetail {
  return {
    ...mapSlide(row),
    layers: (layers ?? []).map(mapLayer),
    isActive: (row.is_active as boolean) ?? true,
    isPublished: (row.is_published as boolean) ?? false,
    startsAt: (row.starts_at as string | null) ?? null,
    endsAt: (row.ends_at as string | null) ?? null,
    createdAt: (row.created_at as string) ?? '',
    updatedAt: (row.updated_at as string) ?? '',
  };
}

export function getSlideImageUrl(imagePath: string | null): string | null {
  if (!imagePath) return null;
  return `${env.supabaseUrl}/storage/v1/object/public/business-slides/${imagePath}`;
}

export const businessSlideService = {
  // ─── Public ───────────────────────────────────────────────────

  async getActiveSlides(): Promise<{ data: BusinessSlide[]; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('get_active_business_slides');
      if (error) {
        logger.error('[businessSlide.getActiveSlides]', error);
        return { data: [], error: error.message };
      }
      const result = data as SlidesResult;
      if (!result.success) {
        return { data: [], error: result.error ?? 'خطا' };
      }
      const slides = (result.slides ?? []).map((row) => {
        const slide = mapSlide(row);
        const rawLayers = (row.layers as Array<Record<string, unknown>>) ?? [];
        slide.layers = rawLayers.map(mapLayer);
        return slide;
      });
      return { data: slides, error: null };
    } catch {
      return { data: [], error: 'خطای غیرمنتظره' };
    }
  },

  // ─── Admin: Slides ────────────────────────────────────────────

  async adminListSlides(): Promise<{ data: BusinessSlideListItem[]; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_list_business_slides');
      if (error) {
        logger.error('[businessSlide.adminListSlides]', error);
        return { data: [], error: error.message };
      }
      const result = data as SlidesResult;
      if (!result.success) {
        return { data: [], error: result.error ?? 'unauthorized' };
      }
      return {
        data: (result.slides ?? []).map(mapSlideListItem),
        error: null,
      };
    } catch {
      return { data: [], error: 'خطای غیرمنتظره' };
    }
  },

  async adminGetSlide(slideId: string): Promise<{ data: BusinessSlideDetail | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_get_business_slide', {
        p_slide_id: slideId,
      });
      if (error) {
        logger.error('[businessSlide.adminGetSlide]', error);
        return { data: null, error: error.message };
      }
      const result = data as SlideResult;
      if (!result.success || !result.slide) {
        return { data: null, error: result.error ?? 'خطا' };
      }
      return {
        data: mapSlideDetail(result.slide, result.layers ?? []),
        error: null,
      };
    } catch {
      return { data: null, error: 'خطای غیرمنتظره' };
    }
  },

  async adminCreateSlide(input: CreateBusinessSlideInput): Promise<{ success: boolean; error: string | null; id?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_create_business_slide', {
        p_internal_name: input.internalName,
        p_title: input.title ?? null,
        p_eyebrow: input.eyebrow ?? null,
        p_description: input.description ?? null,
        p_cta_text: input.ctaText ?? null,
        p_cta_url: input.ctaUrl ?? null,
        p_cta2_text: input.cta2Text ?? null,
        p_cta2_url: input.cta2Url ?? null,
        p_background_image_path: input.backgroundImagePath ?? null,
        p_main_image_path: input.mainImagePath ?? null,
        p_mobile_image_path: input.mobileImagePath ?? null,
        p_overlay_opacity: input.overlayOpacity ?? 40,
        p_content_position: input.contentPosition ?? 'right',
        p_text_color: input.textColor ?? 'light',
        p_animation_type: input.animationType ?? 'fade-slide',
        p_duration_ms: input.durationMs ?? 6000,
        p_transition_ms: input.transitionMs ?? 600,
        p_sort_order: input.sortOrder ?? 0,
        p_is_active: input.isActive ?? true,
        p_is_published: input.isPublished ?? false,
        p_starts_at: input.startsAt ?? null,
        p_ends_at: input.endsAt ?? null,
        p_link_type: input.linkType ?? 'none',
        p_link_business_id: input.linkBusinessId ?? null,
        p_link_category_id: input.linkCategoryId ?? null,
        p_link_custom_url: input.linkCustomUrl ?? null,
      });
      if (error) {
        logger.error('[businessSlide.adminCreateSlide]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null, id: result.id };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminUpdateSlide(slideId: string, input: UpdateBusinessSlideInput): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_business_slide', {
        p_slide_id: slideId,
        p_internal_name: input.internalName ?? null,
        p_title: input.title ?? null,
        p_eyebrow: input.eyebrow ?? null,
        p_description: input.description ?? null,
        p_cta_text: input.ctaText ?? null,
        p_cta_url: input.ctaUrl ?? null,
        p_cta2_text: input.cta2Text ?? null,
        p_cta2_url: input.cta2Url ?? null,
        p_background_image_path: input.backgroundImagePath ?? null,
        p_main_image_path: input.mainImagePath ?? null,
        p_mobile_image_path: input.mobileImagePath ?? null,
        p_overlay_opacity: input.overlayOpacity ?? null,
        p_content_position: input.contentPosition ?? null,
        p_text_color: input.textColor ?? null,
        p_animation_type: input.animationType ?? null,
        p_duration_ms: input.durationMs ?? null,
        p_transition_ms: input.transitionMs ?? null,
        p_sort_order: input.sortOrder ?? null,
        p_is_active: input.isActive ?? null,
        p_is_published: input.isPublished ?? null,
        p_starts_at: input.startsAt ?? null,
        p_ends_at: input.endsAt ?? null,
        p_link_type: input.linkType ?? null,
        p_link_business_id: input.linkBusinessId ?? null,
        p_link_category_id: input.linkCategoryId ?? null,
        p_link_custom_url: input.linkCustomUrl ?? null,
        p_clear_starts_at: input.clearStartsAt ?? false,
        p_clear_ends_at: input.clearEndsAt ?? false,
        p_clear_background_image: input.clearBackgroundImage ?? false,
        p_clear_main_image: input.clearMainImage ?? false,
        p_clear_mobile_image: input.clearMobileImage ?? false,
        p_clear_link_business_id: input.clearLinkBusinessId ?? false,
        p_clear_link_category_id: input.clearLinkCategoryId ?? false,
        p_clear_link_custom_url: input.clearLinkCustomUrl ?? false,
      });
      if (error) {
        logger.error('[businessSlide.adminUpdateSlide]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminDeleteSlide(slideId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_delete_business_slide', {
        p_slide_id: slideId,
      });
      if (error) {
        logger.error('[businessSlide.adminDeleteSlide]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminDuplicateSlide(slideId: string): Promise<{ success: boolean; error: string | null; id?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_duplicate_business_slide', {
        p_slide_id: slideId,
      });
      if (error) {
        logger.error('[businessSlide.adminDuplicateSlide]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null, id: result.id };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminReorderSlides(items: Array<{ id: string; sortOrder: number }>): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_reorder_business_slides', {
        p_items: JSON.stringify(items.map((i) => ({ id: i.id, sort_order: i.sortOrder }))),
      });
      if (error) {
        logger.error('[businessSlide.adminReorderSlides]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  // ─── Admin: Layers ────────────────────────────────────────────

  async adminCreateLayer(input: CreateSlideLayerInput): Promise<{ success: boolean; error: string | null; id?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_create_slide_layer', {
        p_slide_id: input.slideId,
        p_layer_type: input.layerType,
        p_content: input.content ?? null,
        p_image_path: input.imagePath ?? null,
        p_link_url: input.linkUrl ?? null,
        p_position_x: input.positionX ?? 50,
        p_position_y: input.positionY ?? 50,
        p_width: input.width ?? null,
        p_z_index: input.zIndex ?? 0,
        p_animation_delay_ms: input.animationDelayMs ?? 0,
        p_animation_type: input.animationType ?? 'fade-slide',
        p_sort_order: input.sortOrder ?? 0,
        p_is_visible: input.isVisible ?? true,
      });
      if (error) {
        logger.error('[businessSlide.adminCreateLayer]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null, id: result.id };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminUpdateLayer(layerId: string, input: UpdateSlideLayerInput): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_slide_layer', {
        p_layer_id: layerId,
        p_layer_type: input.layerType ?? null,
        p_content: input.content ?? null,
        p_image_path: input.imagePath ?? null,
        p_link_url: input.linkUrl ?? null,
        p_position_x: input.positionX ?? null,
        p_position_y: input.positionY ?? null,
        p_width: input.width ?? null,
        p_z_index: input.zIndex ?? null,
        p_animation_delay_ms: input.animationDelayMs ?? null,
        p_animation_type: input.animationType ?? null,
        p_sort_order: input.sortOrder ?? null,
        p_is_visible: input.isVisible ?? null,
        p_clear_content: input.clearContent ?? false,
        p_clear_image: input.clearImage ?? false,
        p_clear_link_url: input.clearLinkUrl ?? false,
        p_clear_width: input.clearWidth ?? false,
      });
      if (error) {
        logger.error('[businessSlide.adminUpdateLayer]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminDeleteLayer(layerId: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_delete_slide_layer', {
        p_layer_id: layerId,
      });
      if (error) {
        logger.error('[businessSlide.adminDeleteLayer]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminReorderLayers(slideId: string, items: Array<{ id: string; sortOrder: number }>): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_reorder_slide_layers', {
        p_slide_id: slideId,
        p_items: JSON.stringify(items.map((i) => ({ id: i.id, sort_order: i.sortOrder }))),
      });
      if (error) {
        logger.error('[businessSlide.adminReorderLayers]', error);
        return { success: false, error: error.message };
      }
      const result = data as RpcResult;
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  // ─── Image Upload ─────────────────────────────────────────────

  async uploadImage(file: File, type: 'background' | 'main' | 'mobile' | 'layer'): Promise<{ path: string | null; error: string | null }> {
    try {
      const ext = file.name.split('.').pop() || 'webp';
      const fileName = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('business-slides')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) {
        logger.error('[businessSlide.uploadImage]', upErr);
        return { path: null, error: upErr.message };
      }
      return { path: fileName, error: null };
    } catch {
      return { path: null, error: 'خطای غیرمنتظره' };
    }
  },

  getImageUrl(imagePath: string | null): string | null {
    return getSlideImageUrl(imagePath);
  },
};
