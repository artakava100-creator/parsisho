const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number): string {
  return String(value).replace(/[0-9]/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function formatNumber(value: number): string {
  return toPersianDigits(value.toLocaleString('en-US'));
}

export function formatCompact(value: number): string {
  if (value >= 1_000_000) return toPersianDigits((value / 1_000_000).toFixed(1)) + ' م';
  if (value >= 1_000) return toPersianDigits((value / 1_000).toFixed(1)) + ' ه';
  return toPersianDigits(value);
}

export function formatCurrency(value: number): string {
  return formatNumber(value) + ' پارسی';
}

export function formatToman(value: number): string {
  return formatNumber(value) + ' تومان';
}

export function formatPercent(value: number): string {
  return toPersianDigits(value) + '٪';
}

const PERSIAN_TO_LATIN: Record<string, string> = {
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4',
  '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function parsePersianNumber(input: string): number {
  const latin = input.replace(/[۰-۹]/g, (d) => PERSIAN_TO_LATIN[d] ?? d);
  const cleaned = latin.replace(/[,،\s]/g, '');
  return parseInt(cleaned, 10);
}

export function normalizePhoneNumber(input: string): string {
  const latin = input.replace(/[۰-۹]/g, (d) => PERSIAN_TO_LATIN[d] ?? d);
  const digits = latin.replace(/\D/g, '');
  if (digits.startsWith('98') && digits.length === 13) return '0' + digits.slice(2);
  if (digits.startsWith('0098') && digits.length === 15) return '0' + digits.slice(4);
  return digits;
}

export function isValidIranianMobile(input: string): boolean {
  const normalized = normalizePhoneNumber(input);
  return /^09\d{9}$/.test(normalized);
}

export function maskPhoneNumber(phone: string): string {
  const normalized = normalizePhoneNumber(phone);
  if (normalized.length !== 11) return toPersianDigits(normalized);
  const masked = normalized.slice(0, 4) + '****' + normalized.slice(8);
  return toPersianDigits(masked);
}
