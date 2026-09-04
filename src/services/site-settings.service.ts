import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';

export interface SiteSettingsMap {
  [key: string]: unknown;
}

export const siteSettingsService = {
  async get(key: string): Promise<{ data: unknown; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();

      if (error) {
        logger.error('[siteSettings.get]', error);
        return { data: null, error: error.message };
      }
      return { data: data?.value ?? null, error: null };
    } catch {
      return { data: null, error: 'خطای غیرمنتظره' };
    }
  },

  async getMultiple(keys: string[]): Promise<{ data: SiteSettingsMap; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', keys);

      if (error) {
        logger.error('[siteSettings.getMultiple]', error);
        return { data: {}, error: error.message };
      }

      const map: SiteSettingsMap = {};
      for (const row of data ?? []) {
        map[row.key] = row.value;
      }
      return { data: map, error: null };
    } catch {
      return { data: {}, error: 'خطای غیرمنتظره' };
    }
  },

  async upsert(key: string, value: unknown): Promise<{ success: boolean; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_upsert_site_setting', {
        p_key: key,
        p_value: value,
      });

      if (error) {
        logger.error('[siteSettings.upsert]', error);
        return { success: false, error: error.message };
      }

      const result = data as { success: boolean; error?: string };
      if (!result.success) {
        return { success: false, error: result.error ?? 'به‌روزرسانی ناموفق بود' };
      }
      return { success: true, error: null };
    } catch {
      return { success: false, error: 'خطای غیرمنتظره' };
    }
  },
};
