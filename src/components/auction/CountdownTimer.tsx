import { useEffect, useState, useRef } from 'react';
import { Clock } from 'lucide-react';
import { toPersianDigits } from '@/lib/persian';

interface CountdownTimerProps {
  endsAt: string;
  startsAt?: string;
  serverTimeOffset?: number;
  onExpire?: () => void;
  onFinalTenSeconds?: () => void;
  onFinalMinute?: () => void;
  variant?: 'default' | 'compact' | 'hero';
}

interface TimeParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  hasStarted: boolean;
  totalSeconds: number;
}

function calcTimeParts(startsAt: string, endsAt: string, now: number): TimeParts {
  const start = new Date(startsAt).getTime();
  const end = new Date(endsAt).getTime();

  if (now < start) {
    const diff = start - now;
    const days = Math.floor(diff / 86400000);
    const hours = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds, isExpired: false, hasStarted: false, totalSeconds: Math.floor(diff / 1000) };
  }

  if (now >= end) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true, hasStarted: true, totalSeconds: 0 };
  }

  const diff = end - now;
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff % 86400000) / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  const seconds = Math.floor((diff % 60000) / 1000);
  return { days, hours, minutes, seconds, isExpired: false, hasStarted: true, totalSeconds: Math.floor(diff / 1000) };
}

export function CountdownTimer({
  endsAt,
  startsAt,
  serverTimeOffset = 0,
  onExpire,
  onFinalTenSeconds,
  onFinalMinute,
  variant = 'default',
}: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now() + serverTimeOffset);
  const expiredRef = useRef(calcTimeParts(startsAt ?? endsAt, endsAt, Date.now() + serverTimeOffset).isExpired);
  const finalTenRef = useRef(false);
  const finalMinuteRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const newNow = Date.now() + serverTimeOffset;
      setNow(newNow);
      const parts = calcTimeParts(startsAt ?? endsAt, endsAt, newNow);

      if (parts.isExpired && !expiredRef.current) {
        expiredRef.current = true;
        onExpire?.();
      }

      if (parts.hasStarted && !parts.isExpired && parts.totalSeconds <= 10 && !finalTenRef.current) {
        finalTenRef.current = true;
        onFinalTenSeconds?.();
      }

      if (parts.hasStarted && !parts.isExpired && parts.totalSeconds <= 60 && !finalMinuteRef.current) {
        finalMinuteRef.current = true;
        onFinalMinute?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [endsAt, startsAt, serverTimeOffset, onExpire, onFinalTenSeconds, onFinalMinute]);

  const parts = calcTimeParts(startsAt ?? endsAt, endsAt, now);
  const isFinalTen = parts.hasStarted && !parts.isExpired && parts.totalSeconds <= 10;
  const isFinalMinute = parts.hasStarted && !parts.isExpired && parts.totalSeconds <= 60 && parts.totalSeconds > 10;

  // ─── Expired state ────────────────────────────────
  if (parts.isExpired) {
    return (
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-neutral-100 text-neutral-500"
        role="timer"
        aria-live="polite"
      >
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">مزایده به پایان رسید</span>
      </div>
    );
  }

  // ─── Not started state ─────────────────────────────
  if (!parts.hasStarted) {
    const timeStr = `${toPersianDigits(String(parts.hours).padStart(2, '0'))}:${toPersianDigits(String(parts.minutes).padStart(2, '0'))}:${toPersianDigits(String(parts.seconds).padStart(2, '0'))}`;
    return (
      <div
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-secondary-500/10 border border-secondary-500/30 text-secondary-700"
        role="timer"
        aria-live="polite"
      >
        <Clock className="w-4 h-4" />
        <span className="text-sm font-medium">
          {parts.days > 0 && `${toPersianDigits(parts.days)} روز و `}
          {timeStr}
        </span>
      </div>
    );
  }

  // ─── Active countdown ─────────────────────────────
  const timeUnits = [
    { label: 'روز', value: parts.days, show: parts.days > 0 },
    { label: 'ساعت', value: parts.hours, show: true },
    { label: 'دقیقه', value: parts.minutes, show: true },
    { label: 'ثانیه', value: parts.seconds, show: true },
  ];

  // Compact variant — small inline
  if (variant === 'compact') {
    const timeStr = `${toPersianDigits(String(parts.hours).padStart(2, '0'))}:${toPersianDigits(String(parts.minutes).padStart(2, '0'))}:${toPersianDigits(String(parts.seconds).padStart(2, '0'))}`;
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold tabular-nums ${
          isFinalTen
            ? 'bg-error-50 border border-error-200 text-error-700 animate-pulse'
            : isFinalMinute
              ? 'bg-warning-50 border border-warning-500/30 text-warning-700'
              : 'bg-primary-50 border border-primary-300 text-primary-700'
        }`}
        role="timer"
        aria-live={isFinalTen ? 'assertive' : 'polite'}
      >
        <Clock className="w-3.5 h-3.5" />
        {parts.days > 0 && <span>{toPersianDigits(parts.days)} روز</span>}
        <span>{timeStr}</span>
      </div>
    );
  }

  // Hero variant — large, prominent display
  if (variant === 'hero') {
    let heroStateClass = 'bg-primary-50 border border-primary-200';
    let heroIconColor = 'text-primary-600';
    let heroTextColor = 'text-primary-700';
    let heroUnitBg = 'bg-white/60';

    if (isFinalTen) {
      heroStateClass = 'bg-error-50 border border-error-300';
      heroIconColor = 'text-error-600';
      heroTextColor = 'text-error-700';
      heroUnitBg = 'bg-error-100/40';
    } else if (isFinalMinute) {
      heroStateClass = 'bg-accent-50 border border-accent-200';
      heroIconColor = 'text-accent-600';
      heroTextColor = 'text-accent-700';
      heroUnitBg = 'bg-accent-100/40';
    }

    return (
      <div
        className={`inline-flex items-center gap-3 px-5 py-4 rounded-2xl ${heroStateClass}`}
        role="timer"
        aria-live={isFinalTen ? 'assertive' : 'polite'}
        aria-label={`زمان باقیمانده: ${parts.days} روز ${parts.hours} ساعت ${parts.minutes} دقیقه ${parts.seconds} ثانیه`}
      >
        <Clock className={`w-5 h-5 shrink-0 ${heroIconColor}`} />
        <div dir="ltr" className="flex items-center gap-1.5">
          {timeUnits.filter((u) => u.show).map((unit, idx, arr) => (
            <div key={idx} className="flex items-center gap-1.5">
              <div className={`flex flex-col items-center px-2.5 py-1.5 rounded-lg ${heroUnitBg} min-w-[3rem]`}>
                <span className={`text-2xl sm:text-3xl font-extrabold tabular-nums leading-none ${heroTextColor}`}>
                  {toPersianDigits(String(unit.value).padStart(2, '0'))}
                </span>
                <span className="text-[10px] text-neutral-500 mt-1 font-medium">{unit.label}</span>
              </div>
              {idx < arr.length - 1 && (
                <span className={`text-2xl font-bold ${heroTextColor} opacity-30 leading-none`}>:</span>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Default variant
  const baseClass = 'inline-flex items-center gap-2 px-4 py-2 rounded-lg';

  let stateClass = 'bg-primary-50 border border-primary-300';
  let iconColor = 'text-primary-600';
  let textColor = 'text-primary-700';

  if (isFinalTen) {
    stateClass = 'bg-error-50 border-2 border-error-500/50 animate-pulse';
    iconColor = 'text-error-600';
    textColor = 'text-error-700';
  } else if (isFinalMinute) {
    stateClass = 'bg-warning-50 border border-warning-300';
    iconColor = 'text-warning-600';
    textColor = 'text-warning-700';
  }

  return (
    <div
      className={`${baseClass} ${stateClass}`}
      role="timer"
      aria-live={isFinalTen ? 'assertive' : 'polite'}
      aria-label={`زمان باقیمانده: ${parts.days} روز ${parts.hours} ساعت ${parts.minutes} دقیقه ${parts.seconds} ثانیه`}
    >
      <Clock className={`w-5 h-5 ${iconColor} ${isFinalTen ? 'animate-pulse' : ''}`} />
      <div className="flex items-center gap-1">
        {timeUnits.filter((u) => u.show).map((unit, idx, arr) => (
          <div key={idx} className="flex items-center gap-1">
            <div className="flex flex-col items-center">
              <span className={`text-2xl font-extrabold tabular-nums leading-none ${textColor}`}>
                {toPersianDigits(String(unit.value).padStart(2, '0'))}
              </span>
              <span className="text-[10px] text-neutral-500 mt-1">{unit.label}</span>
            </div>
            {idx < arr.length - 1 && (
              <span className={`text-2xl font-bold ${textColor} opacity-50`}>:</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
