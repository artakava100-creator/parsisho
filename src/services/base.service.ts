import { supabase } from '@/lib/supabase';
import { normalizeError } from './api-error';
import { logger } from '@/lib/logger';
import type { ApiError } from '@/types';

export abstract class BaseService {
  protected client = supabase;

  protected handleError(error: unknown, context: string): ApiError {
    const normalized = normalizeError(error);
    logger.error(`[${context}] ${normalized.message}`, { code: normalized.code });
    return normalized;
  }
}
