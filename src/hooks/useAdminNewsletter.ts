import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminNewsletterService } from '@/services/admin-newsletter.service';
import type { NewsletterSubscriber, NewsletterStats, NewsletterListResult } from '@/types';

const QUERY_KEY = ['admin', 'newsletter'];
const STATS_KEY = ['admin', 'newsletter-stats'];

export function useNewsletterSubscribers(
  search: string,
  statusFilter: string,
  page: number,
  pageSize: number,
) {
  return useQuery<NewsletterListResult>({
    queryKey: [...QUERY_KEY, 'list', search, statusFilter, page, pageSize],
    queryFn: ({ signal }) =>
      adminNewsletterService.listSubscribers(search, statusFilter, page, pageSize, signal),
    placeholderData: (prev) => prev,
  });
}

export function useNewsletterStats() {
  return useQuery<NewsletterStats>({
    queryKey: STATS_KEY,
    queryFn: () => adminNewsletterService.getStats(),
  });
}

export function useUpdateSubscriberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ subscriberId, status }: { subscriberId: string; status: 'active' | 'unsubscribed' }) =>
      adminNewsletterService.updateSubscriberStatus(subscriberId, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useDeleteSubscriber() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (subscriberId: string) => adminNewsletterService.deleteSubscriber(subscriberId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: STATS_KEY });
    },
  });
}

export function useSubscribeNewsletter() {
  return useMutation({
    mutationFn: (email: string) => adminNewsletterService.subscribe(email),
  });
}
