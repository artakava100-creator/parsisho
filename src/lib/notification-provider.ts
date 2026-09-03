export type NotificationChannel = 'in_app' | 'sms';
export type NotificationStatus = 'pending' | 'queued' | 'sent' | 'failed' | 'not_configured';

export type SmsProviderStatus = 'not_configured' | 'active' | 'error';

export interface SmsSendRequest {
  to: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface SmsSendResponse {
  success: boolean;
  status: NotificationStatus;
  error?: string;
  reference?: string;
}

export interface SmsProviderAdapter {
  readonly name: string;
  readonly status: SmsProviderStatus;
  send(req: SmsSendRequest): Promise<SmsSendResponse>;
}

export const smsProviderStatus: SmsProviderStatus = 'not_configured';

export const smsNotConfiguredMessage = 'سرویس پیامک هنوز فعال نشده است';

class NotConfiguredSmsProvider implements SmsProviderAdapter {
  readonly name = 'not_configured';
  readonly status: SmsProviderStatus = 'not_configured';

  async send(): Promise<SmsSendResponse> {
    return {
      success: false,
      status: 'not_configured',
      error: smsNotConfiguredMessage,
    };
  }
}

export const smsProvider: SmsProviderAdapter = new NotConfiguredSmsProvider();

export function isSmsConfigured(): boolean {
  return smsProvider.status === 'active';
}
