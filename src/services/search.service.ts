import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { SiteSearchResult } from '@/types';

export class SearchService extends BaseService {
  async siteSearch(query: string, limit: number = 10): Promise<SiteSearchResult> {
    const { data, error } = await this.client.rpc('site_search', {
      p_query: query,
      p_limit: limit,
    });

    if (error) throw normalizeError(error);

    return data as SiteSearchResult;
  }
}

export const searchService = new SearchService();
