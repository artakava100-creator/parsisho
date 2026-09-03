import { create } from 'zustand';

type Theme = 'dark' | 'light' | 'system';

interface UIState {
  theme: Theme;
  mobileMenuOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleMobileMenu: () => void;
  setMobileMenu: (open: boolean) => void;
}

export const useUIStore = create<UIState>((set) => ({
  theme: 'dark',
  mobileMenuOpen: false,
  setTheme: (theme) => set({ theme }),
  toggleMobileMenu: () => set((s) => ({ mobileMenuOpen: !s.mobileMenuOpen })),
  setMobileMenu: (open) => set({ mobileMenuOpen: open }),
}));
