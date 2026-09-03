import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { env } from '@/config/env';
import { logger } from '@/lib/logger';

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (client) return client;

  if (!env.hasSupabaseConfig) {
    logger.error('Supabase تنظیم نشده است — متغیرهای محیطی موجود نیستند');
    throw new Error('اتصال به دیتابیس برقرار نیست. لطفاً تنظیمات سرور را بررسی کنید.');
  }

  client = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
  return client;
}

/**
 * Lazy Supabase client — defers initialization until first access
 * so missing env vars don't crash the app at module load time.
 */
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    const c = getClient();
    const value = (c as unknown as Record<string | symbol, unknown>)[prop];
    return typeof value === 'function' ? value.bind(c) : value;
  },
});
