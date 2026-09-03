import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { PaymentOrder, ApiError } from '@/types';

interface AdminListResult {
  success: boolean;
  error?: string;
  orders?: PaymentOrderRow[];
  total?: number;
}

interface PaymentOrderRow {
  id: string;
  user_id: string;
  package_id: string | null;
  amount: number;
  currency: string;
  status: string;
  gateway: string | null;
  gateway_reference: string | null;
  authority: string | null;
  idempotency_key: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  failed_at: string | null;
}

function mapPaymentOrder(row: PaymentOrderRow): PaymentOrder {
  return {
    id: row.id,
    userId: row.user_id,
    packageId: row.package_id,
    amount: row.amount,
    currency: row.currency,
    status: row.status as PaymentOrder['status'],
    gateway: row.gateway,
    gatewayReference: row.gateway_reference,
    authority: row.authority,
    idempotencyKey: row.idempotency_key,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    paidAt: row.paid_at,
    failedAt: row.failed_at,
  };
}

export class AdminPaymentService extends BaseService {
  async getAll(status?: string, limit = 50, offset = 0): Promise<{ orders: PaymentOrder[]; total: number }> {
    const { data, error } = await this.client.rpc('admin_list_payment_orders', {
      p_status: status ?? null,
      p_limit: limit,
      p_offset: offset,
    });

    if (error) throw normalizeError(error);

    const result = data as AdminListResult;
    if (!result.success) {
      throw { message: result.error ?? 'خطا در دریافت پرداخت‌ها' } as ApiError;
    }

    return {
      orders: (result.orders ?? []).map(mapPaymentOrder),
      total: result.total ?? 0,
    };
  }
}

export const adminPaymentService = new AdminPaymentService();
