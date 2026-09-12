import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { NewsletterSubscriber, NewsletterStats, NewsletterListResult, ApiError } from '@/types';

interface SubscribeResult {
  success: boolean;
  error?: string;
  message?: string;
}

interface ListResult {
  success: boolean;
  error?: string;
  items?: Array<{
    id: string;
    email: string;
    status: string;
    subscribed_at: string;
    unsubscribed_at: string | null;
    updated_at: string;
    source: string;
  }>;
  total?: number;
  page?: number;
  page_size?: number;
}

interface MutationResult {
  success: boolean;
  error?: string;
}

interface StatsResult {
  success: boolean;
  error?: string;
  total?: number;
  active?: number;
  unsubscribed?: number;
}

function mapSubscriber(row: ListResult['items'] extends (infer T)[] | undefined ? T : never): NewsletterSubscriber {
  return {
    id: row.id,
    email: row.email,
    status: row.status as 'active' | 'unsubscribed',
    subscribedAt: row.subscribed_at,
    unsubscribedAt: row.unsubscribed_at,
    updatedAt: row.updated_at,
    source: row.source,
  };
 }

export class AdminNewsletterService extends BaseService {
  async subscribe(email: string): Promise<string> {
    const { data, error } = await this.client.rpc('subscribe_newsletter', { p_email: email });
    if (error) throw normalizeError(error);

    const result = data as SubscribeResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در ثبت اشتراک' } as ApiError;
    }
    return result.message ?? 'ایمیل شما در خبرنامه ثبت شد';
  }

  async listSubscribers(
    search?: string,
    statusFilter?: string,
    page?: number,
    pageSize?: number,
  signal?: AbortSignal,
  ): Promise<NewsletterListResult> {
    const { data, error } = await this.client.rpc(
      'admin_list_newsletter_subscribers',
      {
        p_search: search ?? null,
        p_status_filter: statusFilter ?? 'all',
        p_page: page ?? 1,
        p_page_size: pageSize ?? 20,
      },
      { abortSignal: signal },
    );
    if (error) throw normalizeError(error);

    const result = data as ListResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت لیست مشترکین' } as ApiError;
    }

    return {
      items: (result.items ?? []).map(mapSubscriber),
      total: result.total ?? 0,
      page: result.page ?? 1,
      pageSize: result.page_size ?? 20,
    };
  }

  async updateSubscriberStatus(subscriberId: string, status: 'active' | 'unsubscribed'): Promise<void> {
    const { data, error } = await this.client.rpc('admin_update_subscriber_status', {
      p_subscriber_id: subscriberId,
      p_status: status,
    });
    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در تغییر وضعیت' } as ApiError;
    }
  }

  async deleteSubscriber(subscriberId: string): Promise<void> {
    const { data, error } = await this.client.rpc('admin_delete_subscriber', {
      p_subscriber_id: subscriberId,
    });
    if (error) throw normalizeError(error);

    const result = data as MutationResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در حذف مشترک' } as ApiError;
    }
  }

  async getStats(): Promise<NewsletterStats> {
    const { data, error } = await this.client.rpc('admin_newsletter_stats');
    if (error) throw normalizeError(error);

    const result = data as StatsResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت آمار' } as ApiError;
    }

    return {
      total: result.total ?? 0,
      active: result.active ?? 0,
      unsubscribed: result.unsubscribed ?? 0,
    };
  }
}

export const adminNewsletterService = new AdminNewsletterService();
