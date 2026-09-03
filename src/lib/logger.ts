import { env } from '@/config/env';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const MIN_LEVEL: LogLevel = env.isDev ? 'debug' : 'warn';

const SENSITIVE_KEYS = ['password', 'token', 'secret', 'key', 'authorization', 'email'];

function redact(data: unknown): unknown {
  if (data === null || typeof data !== 'object') return data;
  if (Array.isArray(data)) return data.map(redact);
  const obj = data as Record<string, unknown>;
  return Object.fromEntries(
    Object.entries(obj).map(([k, v]) => [
      k,
      SENSITIVE_KEYS.some((s) => k.toLowerCase().includes(s)) ? '[REDACTED]' : redact(v),
    ]),
  );
}

function log(level: LogLevel, message: string, data?: unknown) {
  if (LOG_LEVELS[level] < LOG_LEVELS[MIN_LEVEL]) return;

  const safeData = data !== undefined ? redact(data) : undefined;

  const fn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  fn(`[${level.toUpperCase()}] ${message}`, safeData ?? '');
}

export const logger = {
  debug: (msg: string, data?: unknown) => log('debug', msg, data),
  info: (msg: string, data?: unknown) => log('info', msg, data),
  warn: (msg: string, data?: unknown) => log('warn', msg, data),
  error: (msg: string, data?: unknown) => log('error', msg, data),
};
