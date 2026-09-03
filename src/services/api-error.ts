import type { ApiError } from '@/types';
import { logger } from '@/lib/logger';

const PERSIAN_ERROR_MAP: Record<string, string> = {
  'Invalid login credentials': 'ایمیل یا رمز عبور نادرست است',
  'Email not confirmed': 'ایمیل شما تأیید نشده است. لطفاً صندوق ورودی خود را بررسی کنید',
  'User already registered': 'این ایمیل قبلاً ثبت شده است. لطفاً وارد شوید',
  'Password should be at least 6 characters': 'رمز عبور باید حداقل ۶ کاراکتر باشد',
  'Unable to validate email address': 'آدرس ایمیل نامعتبر است',
  'Network request failed': 'اتصال به سرور برقرار نشد. لطفاً اتصال اینترنت خود را بررسی کنید',
  'JWT expired': 'نشست شما منقضی شده است. لطفاً دوباره وارد شوید',
  'over_request_rate_limit': 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید',
  'rate_limit_exceeded': 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً کمی بعد تلاش کنید',
  'Error getting user by external id': 'خطا در ارتباط با Google. لطفاً دوباره تلاش کنید',
  'provider is not enabled': 'ورود با Google فعلاً فعال نیست. لطفاً با ایمیل وارد شوید',
  'OAuth provider is not enabled': 'ورود با Google فعلاً فعال نیست. لطفاً با ایمیل وارد شوید',
  'User not found': 'کاربر یافت نشد',
  'Email rate limit exceeded': 'تعداد ایمیل‌های ارسالی بیش از حد مجاز است. لطفاً چند دقیقه بعد تلاش کنید',
  'Password reset requires a valid email': 'برای بازنشانی رمز عبور، ایمیل معتبر وارد کنید',
  'Token has expired or is invalid': 'لینک بازنشانی منقضی یا نامعتبر است. لطفاً دوباره درخواست دهید',
  'Token has expired': 'لینک منقضی شده است. لطفاً دوباره درخواست دهید',
  'invalid_credentials': 'اطلاعات ورود نامعتبر است',
  'signup_disabled': 'ثبت‌نام فعلاً غیرفعال است',
  'email_exists': 'این ایمیل قبلاً ثبت شده است',
  'Phone not found': 'شماره موبایل یافت نشد',
  'Phone OTP expired or invalid': 'کد تأیید موبایل منقضی یا نامعتبر است',
  'Phone number is not verified': 'شماره موبایل تأیید نشده است',
  'reauthentication_needed': 'برای این عملیات باید دوباره وارد شوید',
  'same_password': 'رمز عبور جدید نباید با رمز قبلی یکسان باشد',
  'weak_password': 'رمز عبور ضعیف است. از ترکیب حروف، اعداد و نمادها استفاده کنید',
  'session_not_found': 'نشست یافت نشد. لطفاً دوباره وارد شوید',
  'user_suspended': 'حساب کاربری شما تعلیق شده است. با پشتیبانی تماس بگیرید',
  'user_banned': 'دسترسی به حساب کاربری شما مسدود شده است',
};

export function normalizeError(error: unknown): ApiError {
  if (error === null || error === undefined) {
    return { message: 'خطای ناشناخته رخ داده است' };
  }

  if (typeof error === 'string') {
    return { message: PERSIAN_ERROR_MAP[error] ?? error };
  }

  if (error instanceof Error) {
    return { message: PERSIAN_ERROR_MAP[error.message] ?? error.message };
  }

  const err = error as Record<string, unknown>;
  const supabaseMessage = err.message as string | undefined;

  if (supabaseMessage) {
    return { message: PERSIAN_ERROR_MAP[supabaseMessage] ?? supabaseMessage, code: err.code as string | undefined };
  }

  logger.error('Unrecognized error shape', error);
  return { message: 'مشکلی پیش آمده است. لطفاً دوباره تلاش کنید' };
}

export function isApiError(error: unknown): error is ApiError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as Record<string, unknown>).message === 'string'
  );
}
