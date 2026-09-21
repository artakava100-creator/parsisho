import { toPersianDigits } from './persian';

export const PERSIAN_MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد',
  'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر',
  'دی', 'بهمن', 'اسفند',
];

const PERSIAN_WEEKDAYS = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];

// ─── Core conversion: Gregorian → Jalali ─────────────────────────────
// Standard algorithm from jalaali-js (proven, widely used). Accurate for all years.

function div(a: number, b: number): number {
  return Math.floor(a / b);
}

function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 6 ? gy + 1 : gy;
  let days =
    365 * gy +
    div(gy2 + 3, 4) -
    div(gy2 + 99, 100) +
    div(gy2 + 399, 400) -
    80 +
    g_d_m[gm - 1] +
    gd;
  jy += 33 * div(days, 12053);
  days %= 12053;
  jy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    jy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + div(days, 31) : 7 + div(days - 186, 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

// ─── Core conversion: Jalali → Gregorian ─────────────────────────────
// Standard algorithm from jalaali-js. Accurate for all years.
// The previous implementation was completely broken (produced dates centuries off).

function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    div(jy, 33) * 8 +
    div((jy % 33) + 3, 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * div(days, 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * div(--days, 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * div(days, 1461);
  days %= 1461;
  if (days > 365) {
    gy += div(days - 1, 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13 && gd > sal_a[gm]; gm++) gd -= sal_a[gm];
  return [gy, gm, gd];
}

// ─── Jalali leap year & month length ─────────────────────────────────

export function isJalaliLeapYear(jy: number): boolean {
  const breaks = [
    -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181,
    1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394,
    2456, 3178,
  ];
  let jump = 0;
  for (let i = 0; i < breaks.length; i++) {
    const leapJ = breaks[i];
    const jp = breaks[i - 1] ?? leapJ;
    const leap = leapJ - jp;
    if (jy < leapJ) {
      jump += jy - jp - 1;
      break;
    }
    jump += leap - 1;
  }
  const leapN = ((jump % 33) + 33) % 33;
  return leapN % 4 === 0 && leapN !== 32;
}

export function jalaliMonthLength(jy: number, jm: number): number {
  if (jm <= 6) return 31;
  if (jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

// Returns the weekday index for the 1st of a Jalali month.
// 0 = Saturday (شنبه), 1 = Sunday, ..., 6 = Friday (جمعه)
export function jalaliFirstWeekday(jy: number, jm: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, 1);
  const d = new Date(Date.UTC(gy, gm - 1, gd, 12, 0, 0));
  // JS getUTCDay(): 0=Sun, 1=Mon, ..., 6=Sat
  // We want 0=Sat, 1=Sun, ..., 6=Fri
  return (d.getUTCDay() + 1) % 7;
}

// ─── Public interfaces & formatting ──────────────────────────────────

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

// ─── Jalali → ISO conversion ─────────────────────────────────────────
// Produces a noon-UTC ISO string so the date never shifts due to timezone.

export function jalaliToISODate(jy: number, jm: number, jd: number): string {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  return `${gy}-${String(gm).padStart(2, '0')}-${String(gd).padStart(2, '0')}T12:00:00Z`;
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
