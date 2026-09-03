import { BaseService } from './base.service';
import { normalizeError } from './api-error';
import type { Wallet, WalletTransaction, WalletTxType, WalletTxStatus, ParsiPackage, PaymentOrder, CreatePaymentOrderResult, ConfirmPaymentResult, ApiError } from '@/types';

interface WalletRow {
  user_id: string;
  available_balance: number;
  locked_balance: number;
  created_at: string;
  updated_at: string;
}

interface TransactionRow {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  status: string;
  payment_order_id: string | null;
  created_at: string;
}

interface ParsiPackageRow {
  id: string;
  parsi_amount: number;
  price: number;
  bonus_amount: number;
  is_active: boolean;
  sort_order: number;
  label: string | null;
  created_at: string;
  updated_at: string;
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

function mapWallet(row: WalletRow): Wallet {
  return {
    userId: row.user_id,
    availableBalance: row.available_balance,
    lockedBalance: row.locked_balance,
  };
}

function mapTransaction(row: TransactionRow): WalletTransaction {
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as WalletTxType,
    amount: row.amount,
    balanceAfter: row.balance_after,
    description: row.description,
    status: row.status as WalletTxStatus,
    paymentOrderId: row.payment_order_id,
    createdAt: row.created_at,
  };
}

function mapPackage(row: ParsiPackageRow): ParsiPackage {
  return {
    id: row.id,
    parsiAmount: row.parsi_amount,
    price: row.price,
    bonusAmount: row.bonus_amount,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    label: row.label,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
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

export class WalletService extends BaseService {
  async getWallet(): Promise<Wallet | null> {
    const { data, error } = await this.client.rpc('get_or_create_wallet');

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      const errMsg = result.error as string | undefined;
      if (errMsg) throw { message: errMsg } as ApiError;
      return null;
    }

    const walletData = result.wallet as WalletRow;
    return mapWallet(walletData);
  }

  async getTransactions(limit = 50): Promise<WalletTransaction[]> {
    const { data, error } = await this.client
      .from('wallet_transactions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw normalizeError(error);
    return (data as TransactionRow[]).map(mapTransaction);
  }

  async getPackages(): Promise<ParsiPackage[]> {
    const { data, error } = await this.client
      .from('parsi_packages')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true });

    if (error) throw normalizeError(error);
    return (data as ParsiPackageRow[]).map(mapPackage);
  }

  async purchasePackage(packageId: string): Promise<Wallet> {
    const { data, error } = await this.client.rpc('purchase_parsi_package', {
      p_package_id: packageId,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در خرید پکیج' } as ApiError;
    }

    const walletData = result.wallet as WalletRow;
    return mapWallet(walletData);
  }

  async createPaymentOrder(packageId: string, idempotencyKey: string): Promise<CreatePaymentOrderResult> {
    const { data, error } = await this.client.rpc('create_payment_order', {
      p_package_id: packageId,
      p_idempotency_key: idempotencyKey,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      return { success: false, error: (result.error as string) ?? 'خطا در ایجاد سفارش پرداخت' };
    }

    return {
      success: true,
      paymentOrder: mapPaymentOrder(result.payment_order as PaymentOrderRow),
      isExisting: result.is_existing as boolean,
    };
  }

  async confirmPayment(paymentOrderId: string): Promise<ConfirmPaymentResult> {
    const { data, error } = await this.client.rpc('confirm_payment', {
      p_payment_order_id: paymentOrderId,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      return {
        success: false,
        error: (result.error as string) ?? 'خطا در تأیید پرداخت',
        code: (result.code as string) ?? undefined,
      };
    }

    return {
      success: true,
      alreadyConfirmed: result.already_confirmed as boolean | undefined,
      message: result.message as string | undefined,
      wallet: result.wallet ? mapWallet(result.wallet as WalletRow) : undefined,
      creditedAmount: result.credited_amount as number | undefined,
    };
  }

  async cancelPaymentOrder(paymentOrderId: string): Promise<void> {
    const { data, error } = await this.client.rpc('cancel_payment_order', {
      p_payment_order_id: paymentOrderId,
    });

    if (error) throw normalizeError(error);

    const result = data as Record<string, unknown>;
    if (!result.success) {
      throw { message: (result.error as string) ?? 'خطا در لغو سفارش' } as ApiError;
    }
  }

  async getPaymentOrders(limit = 20): Promise<PaymentOrder[]> {
    const { data, error } = await this.client
      .from('payment_orders')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw normalizeError(error);
    return (data as PaymentOrderRow[]).map(mapPaymentOrder);
  }
}

export const walletService = new WalletService();
