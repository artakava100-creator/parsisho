import type { AuthUser, IdentityState, AccountStatus } from '@/types';

const ACCOUNT_STATUS_LABELS: Record<AccountStatus, string> = {
  active: 'فعال',
  restricted: 'محدود',
  suspended: 'تعلیق‌شده',
  disabled: 'غیرفعال',
};

export function getAccountStatusLabel(status: AccountStatus): string {
  return ACCOUNT_STATUS_LABELS[status] ?? status;
}

export function getIdentityState(user: AuthUser | null): IdentityState {
  if (!user) {
    return {
      isRegistered: false,
      isEmailVerified: false,
      hasPhoneNumber: false,
      isPhoneVerified: false,
      isIdentityVerified: false,
      accountStatus: 'active',
      isAuctionEligible: false,
      eligibilityReasons: ['ابتدا وارد شوید'],
    };
  }

  const profile = user.profile;
  const isEmailVerified = user.emailVerified;
  const hasPhoneNumber = Boolean(profile?.phoneNumber);
  const isPhoneVerified = Boolean(profile?.phoneVerifiedAt);
  const isIdentityVerified = Boolean(profile?.identityVerifiedAt);
  const accountStatus = profile?.accountStatus ?? 'active';

  const eligibilityReasons: string[] = [];
  if (!isEmailVerified) eligibilityReasons.push('تأیید ایمیل');
  if (!hasPhoneNumber) eligibilityReasons.push('ثبت شماره موبایل');
  if (!isPhoneVerified) eligibilityReasons.push('تأیید شماره موبایل');
  if (accountStatus !== 'active') eligibilityReasons.push('حساب کاربری فعال');

  const isAuctionEligible =
    isEmailVerified &&
    isPhoneVerified &&
    accountStatus === 'active';

  return {
    isRegistered: true,
    isEmailVerified,
    hasPhoneNumber,
    isPhoneVerified,
    isIdentityVerified,
    accountStatus,
    isAuctionEligible,
    eligibilityReasons,
  };
}

export function getAuctionEligibilityMessage(user: AuthUser | null): string {
  const state = getIdentityState(user);
  if (!user) return 'ابتدا وارد حساب کاربری خود شوید';
  if (state.isAuctionEligible) return 'شما مجاز به کلیک در مزایده هستید';
  return `برای کلیک در مزایده ابتدا باید: ${state.eligibilityReasons.join('، ')}`;
}
