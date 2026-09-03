const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

function requireEnv(key: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `متغیر محیطی ${key} تنظیم نشده است. لطفاً فایل .env را بررسی کنید.`,
    );
  }
  return value;
}

export const env = {
  /** Throws lazily when accessed, not at module load — prevents blank-screen crashes */
  get supabaseUrl() {
    return requireEnv('VITE_SUPABASE_URL', SUPABASE_URL);
  },
  get supabaseAnonKey() {
    return requireEnv('VITE_SUPABASE_ANON_KEY', SUPABASE_ANON_KEY);
  },
  isDev: import.meta.env.DEV,
  isProd: import.meta.env.PROD,
  hasSupabaseConfig: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY),
} as const;
