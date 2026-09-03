import type { PaymentOrder } from '@/types';

export type GatewayStatus = 'not_configured' | 'active' | 'error';

export interface GatewayPaymentRequest {
  amount: number;
  currency: string;
  orderId: string;
  callbackUrl: string;
}

export interface GatewayPaymentResponse {
  success: boolean;
  authority?: string;
  redirectUrl?: string;
  error?: string;
}

export interface GatewayVerifyRequest {
  authority: string;
  amount: number;
}

export interface GatewayVerifyResponse {
  success: boolean;
  reference?: string;
  error?: string;
}

export interface PaymentGatewayAdapter {
  readonly name: string;
  readonly status: GatewayStatus;
  createPayment(req: GatewayPaymentRequest): Promise<GatewayPaymentResponse>;
  verifyPayment(req: GatewayVerifyRequest): Promise<GatewayVerifyResponse>;
}

export const gatewayStatus: GatewayStatus = 'not_configured';

export const gatewayNotConfiguredMessage = 'درگاه پرداخت هنوز فعال نشده است';

class NotConfiguredGateway implements PaymentGatewayAdapter {
  readonly name = 'not_configured';
  readonly status: GatewayStatus = 'not_configured';

  async createPayment(): Promise<GatewayPaymentResponse> {
    return {
      success: false,
      error: gatewayNotConfiguredMessage,
    };
  }

  async verifyPayment(): Promise<GatewayVerifyResponse> {
    return {
      success: false,
      error: gatewayNotConfiguredMessage,
    };
  }
}

export const paymentGateway: PaymentGatewayAdapter = new NotConfiguredGateway();

export function isGatewayConfigured(): boolean {
  return paymentGateway.status === 'active';
}

export function getGatewayStatusMessage(order: PaymentOrder): string {
  if (order.gateway === 'not_configured' || !order.gateway) {
    return gatewayNotConfiguredMessage;
  }
  return '';
}
