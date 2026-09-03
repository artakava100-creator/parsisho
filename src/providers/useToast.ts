import { useContext } from 'react';
import { ToastContext } from './ToastProvider';

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast باید داخل ToastProvider استفاده شود');
  return ctx;
}
