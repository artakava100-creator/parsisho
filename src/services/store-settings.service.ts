import { supabase } from '@/lib/supabase';
import { logger } from '@/lib/logger';
import type { StoreSettings } from '@/types';

function mapSettingsRow(row: Record<string, unknown>): StoreSettings {
  return {
    shippingMode: row.shipping_mode as StoreSettings['shippingMode'],
    fixedShippingFee: row.fixed_shipping_fee as number,
    shippingProvider: (row.shipping_provider as string) ?? null,
    paymentFeeType: row.payment_fee_type as StoreSettings['paymentFeeType'],
    paymentFeePercentage: Number(row.payment_fee_percentage) as number,
    paymentFeeFixedAmount: row.payment_fee_fixed_amount as number,
    updatedAt: row.updated_at as string,
  };
}

const defaultSettings: StoreSettings = {
  shippingMode: 'free',
  fixedShippingFee: 0,
  shippingProvider: null,
  paymentFeeType: 'none',
  paymentFeePercentage: 0,
  paymentFeeFixedAmount: 0,
  updatedAt: '',
};

export const storeSettingsService = {
  async getSettings(): Promise<{ data: StoreSettings; error: string | null }> {
    try {
      const { data, error } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (error) {
        logger.error('[storeSettingsService.getSettings]', error);
        return { data: defaultSettings, error: null };
      }

      if (!data) return { data: defaultSettings, error: null };

      return { data: mapSettingsRow(data as Record<string, unknown>), error: null };
    } catch {
      return { data: defaultSettings, error: null };
    }
  },

  async updateSettings(
    input: Omit<StoreSettings, 'updatedAt'>,
  ): Promise<{ data: StoreSettings | null; error: string | null }> {
    try {
      const { data, error } = await supabase.rpc('admin_update_store_settings', {
        p_shipping_mode: input.shippingMode,
        p_fixed_shipping_fee: input.fixedShippingFee,
        p_shipping_provider: input.shippingProvider,
        p_payment_fee_type: input.paymentFeeType,
        p_payment_fee_percentage: input.paymentFeePercentage,
        p_payment_fee_fixed_amount: input.paymentFeeFixedAmount,
      });

      if (error) {
        logger.error('[storeSettingsService.updateSettings]', error);
        return { data: null, error: 'به‌روزرسانی تنظیمات ناموفق بود' };
      }

      const result = data as Record<string, unknown>;
      if (!result.success) {
        return { data: null, error: (result.error as string) ?? 'به‌روزرسانی ناموفق بود' };
      }

      const { data: settingsData, error: fetchError } = await supabase
        .from('store_settings')
        .select('*')
        .eq('id', 1)
        .maybeSingle();

      if (fetchError || !settingsData) {
        return { data: null, error: null };
      }

      return { data: mapSettingsRow(settingsData as Record<string, unknown>), error: null };
    } catch {
      return { data: null, error: 'خطای غیرمنتظره' };
    }
  },
};
