import { useQuery } from '@tanstack/react-query';
import { adminPaymentService } from '@/services/admin-payment.service';

export function useAdminPaymentOrders(status?: string) {
  return useQuery({
    queryKey: ['admin-payment-orders', status ?? 'all'],
    queryFn: () => adminPaymentService.getAll(status, 100, 0),
  });
}
