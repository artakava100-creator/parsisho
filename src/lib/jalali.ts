import { toPersianDigits } from './persian';

const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 6 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    g_d_m[gm - 1] +
    gd;
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export interface JalaliDate {
  year: number;
  month: number;
  day: number;
  monthName: string;
  weekdayName: string;
}

export function toJalali(date: Date): JalaliDate {
  const [jy, jm, jd] = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  );
  return {
    year: jy,
    month: jm,
    day: jd,
    monthName: PERSIAN_MONTHS[jm - 1],
    weekdayName: PERSIAN_WEEKDAYS[date.getDay()],
  };
}

export function formatJalaliDate(date: Date): string {
  const j = toJalali(date);
  return `${j.weekdayName} ${toPersianDigits(j.day)} ${j.monthName} ${toPersianDigits(j.year)}`;
}

export function formatJalaliShort(date: Date): string {
  const j = toJalali(date);
  return `${toPersianDigits(j.day)} ${j.monthName} ${toPersianDigits(j.year)}`;
}

export function formatTime(date: Date): string {
  const h = toPersianDigits(date.getHours().toString().padStart(2, '0'));
  const m = toPersianDigits(date.getMinutes().toString().padStart(2, '0'));
  return `${h}:${m}`;
}

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  const j_d_m = [0, 31, 31, 31, 31, 31, 31, 30, 30, 30, 30, 30, 29];
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days = 365 * jy + Math.floor(jy / 33) * 12053 + Math.floor((jy % 33) / 4);
  for (let i = 1; i < jm; i++) days += j_d_m[i];
  days += jd;
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [0, 31, ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

export function jalaliToISODate(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}T00:00:00+03:30`;
}

export function parseJalaliInput(input: string): { jy: number; jm: number; jd: number } | null {
  const parts = input.trim().split(/[\/\-]/);
  if (parts.length !== 3) return null;
  const jy = parseInt(parts[0], 10);
  const jm = parseInt(parts[1], 10);
  const jd = parseInt(parts[2], 10);
  if (isNaN(jy) || isNaN(jm) || isNaN(jd)) return null;
  if (jm < 1 || jm > 12 || jd < 1 || jd > 31) return null;
  return { jy, jm, jd };
}

export function formatJalaliInput(date: Date | null): string {
  if (!date) return '';
  const j = toJalali(date);
  return `${toPersianDigits(j.year)}/${toPersianDigits(String(j.month).padStart(2, '0'))}/${toPersianDigits(String(j.day).padStart(2, '0'))}`;
}

export function formatRelativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 30) return formatJalaliShort(date);
  if (days > 0) return `${toPersianDigits(days)} روز پیش`;
  if (hours > 0) return `${toPersianDigits(hours)} ساعت پیش`;
  if (minutes > 0) return `${toPersianDigits(minutes)} دقیقه پیش`;
  if (seconds > 10) return `${toPersianDigits(seconds)} ثانیه پیش`;
  return 'هم‌اکنون';
}

export interface CountdownParts {
  hours: string;
  minutes: string;
  seconds: string;
  isExpired: boolean;
}

export function formatCountdown(targetDate: Date): CountdownParts {
  const diff = targetDate.getTime() - Date.now();
  if (diff <= 0) {
    return { hours: '۰۰', minutes: '۰۰', seconds: '۰۰', isExpired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return {
    hours: toPersianDigits(hours.toString().padStart(2, '0')),
    minutes: toPersianDigits(minutes.toString().padStart(2, '0')),
    seconds: toPersianDigits(seconds.toString().padStart(2, '0')),
    isExpired: false,
  };
}
