import { createContext, useCallback, type ReactNode } from 'react';
import { useToastStore } from '@/stores/toast-store';
import { ToastContainer } from '@/components/ui/Toast';
import type { NotificationType } from '@/types';

interface ToastContextValue {
  show: (type: NotificationType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
}

export const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const addToast = useToastStore((s) => s.add);
  const dismissToast = useToastStore((s) => s.dismiss);

  const show = useCallback(
    (type: NotificationType, title: string, message?: string, duration?: number) => {
      addToast({ type, title, message, duration });
    },
    [addToast],
  );

  const success = useCallback((title: string, message?: string) => show('success', title, message), [show]);
  const error = useCallback((title: string, message?: string) => show('error', title, message, 6000), [show]);
  const warning = useCallback((title: string, message?: string) => show('warning', title, message), [show]);
  const info = useCallback((title: string, message?: string) => show('info', title, message), [show]);
  const dismiss = useCallback((id: string) => dismissToast(id), [dismissToast]);

  return (
    <ToastContext.Provider value={{ show, success, error, warning, info, dismiss }}>
      {children}
      <ToastContainer />
    </ToastContext.Provider>
  );
}

