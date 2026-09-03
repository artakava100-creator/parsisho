import { QueryClient } from '@tanstack/react-query';
import { env } from '@/config/env';

let client: QueryClient | null = null;

export function getQueryClient(): QueryClient {
  if (!client) {
    client = new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 30_000,
          gcTime: 5 * 60_000,
          retry: (failureCount, error) => {
            if (env.isProd && failureCount >= 2) return false;
            const err = error as { status?: number };
            if (err?.status && err.status >= 400 && err.status < 500) return false;
            return failureCount < 2;
          },
          refetchOnWindowFocus: false,
        },
        mutations: {
          retry: false,
        },
      },
    });
  }
  return client;
}
