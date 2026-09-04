import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface Slide {
  id: string;
  title: string | null;
  subtitle: string | null;
  desktop_image_url: string;
  mobile_image_url: string | null;
  cta_text: string | null;
  destination_url: string | null;
  is_active: boolean;
  sort_order: number;
  start_at: string | null;
  end_at: string | null;
  created_at: string;
  updated_at: string;
}

export const slideshowService = {
  async getActiveSlides(): Promise<{ data: Slide[]; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('homepage_slides')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (error) {
        logger.error('[slideshow.getActiveSlides]', error);
        return { data: [], error: error.message };
      }

      const now = new Date().toISOString();
      const filtered = (data ?? []).filter((s) => {
        if (s.start_at && s.start_at > now) return false;
        if (s.end_at && s.end_at < now) return false;
        return true;
      });

      return { data: filtered as Slide[], error: null };
    } catch {
      return { data: [], error: 'خطای غیرمنتظره' };
    }
  },

  async adminListSlides(): Promise<{ data: Slide[]; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_list_slides');
      if (error) {
        logger.error('[slideshow.adminListSlides]', error);
        return { data: [], error: error.message };
      }
      const result = data as { success: boolean; slides?: Slide[]; error?: string };
      if (!result.success) {
        return { data: [], error: result.error ?? 'unauthorized' };
      }
      return { data: result.slides ?? [], error: null };
    } catch {
      return { data: [], error: 'خطای غیرمنتظره' };
    }
  },

  async adminUpsertSlide(slide: Partial<Slide> & { id?: string }): Promise<{ success: boolean; error: string | null; id?: string }> {
    try {
      const { data, error } = await supabase.rpc('admin_upsert_slide', {
        p_id: slide.id ?? null,
        p_title: slide.title ?? null,
        p_subtitle: slide.subtitle ?? null,
        p_desktop_image_url: slide.desktop_image_url !== undefined ? slide.desktop_image_url : null,
        p_mobile_image_url: slide.mobile_image_url ?? null,
        p_cta_text: slide.cta_text ?? null,
        p_destination_url: slide.destination_url ?? null,
        p_is_active: slide.is_active ?? true,
        p_sort_order: slide.sort_order ?? 0,
        p_start_at: slide.start_at ?? null,
        p_end_at: slide.end_at ?? null,
      });
      if (error) {
        logger.error('[slideshow.adminUpsertSlide]', error);
        return { success: false, error: error.message };
      }
      const result = data as { success: boolean; id?: string; error?: string };
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null, id: result.id };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async adminDeleteSlide(id: string): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_delete_slide', { p_id: id });
      if (error) {
        logger.error('[slideshow.adminDeleteSlide]', error);
        return { success: false, error: error.message };
      }
      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        return { success: false, error: result.error ?? 'خطا' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },

  async uploadImage(file: File, type: 'desktop' | 'mobile'): Promise<{ url: string | null; error: string | null }> {
    try {
      const ext = file.name.split('.').pop() || 'jpg';
      const fileName = `slide-${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('slideshow-images')
        .upload(fileName, file, { cacheControl: '3600', upsert: false });
      if (upErr) {
        logger.error('[slideshow.uploadImage]', upErr);
        return { url: null, error: upErr.message };
      }
      const { data: pub } = supabase.storage
        .from('slideshow-images')
        .getPublicUrl(fileName);
      return { url: pub.publicUrl, error: null };
    } catch {
      return { url: null, error: 'خطای غیرمنتظره' };
    }
  },
};
