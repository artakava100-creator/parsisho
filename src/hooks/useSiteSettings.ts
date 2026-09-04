import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { siteSettingsService } from '@/services/site-settings.service';

const SITE_SETTINGS_KEY = 'site-settings';

export function useSiteSetting<T = unknown>(key: string, fallback?: T) {
  return useQuery({
    queryKey: [SITE_SETTINGS_KEY, key],
    queryFn: async () => {
      const { data, error } = await siteSettingsService.get(key);
      if (error || data === null) return fallback ?? null;
      return data as T;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useSiteSettings(keys: string[]) {
  return useQuery({
    queryKey: [SITE_SETTINGS_KEY, 'multi', ...keys],
    queryFn: async () => {
      const { data } = await siteSettingsService.getMultiple(keys);
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateSiteSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: string; value: unknown }) => {
      const result = await siteSettingsService.upsert(key, value);
      if (!result.success) throw new Error(result.error ?? 'خطا');
      return result;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [SITE_SETTINGS_KEY] });
    },
  });
}
