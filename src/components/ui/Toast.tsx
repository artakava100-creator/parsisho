import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { useToastStore } from '@/stores/toast-store';
import { cn } from '@/lib/cn';
import type { NotificationType } from '@/types';

const iconMap: Record<NotificationType, typeof CheckCircle2> = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const styleMap: Record<NotificationType, string> = {
  success: 'border-success-200 text-success-700',
  error: 'border-error-200 text-error-700',
  warning: 'border-warning-200 text-warning-700',
  info: 'border-info-200 text-info-700',
};

export function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 left-4 z-[100] flex flex-col gap-2 w-[calc(100vw-2rem)] max-w-sm"
      role="region"
      aria-label="اعلان‌ها"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              'bg-surface border rounded-lg p-4 shadow-lg animate-scale-in flex items-start gap-3',
              styleMap[toast.type],
            )}
            role="alert"
          >
            <Icon className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-neutral-800">{toast.title}</p>
              {toast.message && (
                <p className="mt-1 text-sm text-neutral-600">{toast.message}</p>
              )}
            </div>
            <button
              onClick={() => dismiss(toast.id)}
              className="flex items-center justify-center w-6 h-6 rounded text-neutral-500 hover:text-neutral-800 hover:bg-neutral-100 transition-colors shrink-0"
              aria-label="بستن"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
