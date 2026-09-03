import { create } from 'zustand';
import type { ToastNotification } from '@/types';

interface ToastState {
  toasts: ToastNotification[];
  add: (toast: Omit<ToastNotification, 'id'>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  add: (toast) => {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? 4000;
    set((state) => ({
      toasts: [...state.toasts, { ...toast, id, duration }],
    }));
    if (duration > 0) {
      setTimeout(() => {
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }));
      }, duration);
    }
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));
