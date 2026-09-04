import type { LucideIcon } from 'lucide-react';
import {
  Gavel, Store, Wallet, Trophy, Gamepad2, Gift, Users, Building2,
} from 'lucide-react';

export interface QuickAccessItem {
  id: string;
  to: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string;
  comingSoon?: boolean;
}

export const quickAccessItems: QuickAccessItem[] = [
  {
    id: 'auction-hall',
    to: '/auctions',
    label: 'تالار مزایده',
    description: 'مزایده‌های زنده و مهیج',
    icon: Gavel,
    badge: 'زنده',
  },
  {
    id: 'marketplace',
    to: '/market',
    label: 'بازار',
    description: 'خرید مستقیم محصولات',
    icon: Store,
  },
  {
    id: 'wallet',
    to: '/wallet',
    label: 'بانک پارسی شو',
    description: 'مدیریت موجودی و شارژ',
    icon: Wallet,
  },
  {
    id: 'missions',
    to: '/missions',
    label: 'مرکز مأموریت‌ها',
    description: 'مأموریت‌های روزانه و هفتگی',
    icon: Trophy,
    comingSoon: true,
  },
  {
    id: 'excitement',
    to: '/excitement',
    label: 'سرزمین هیجان',
    description: 'بازی‌های کوتاه و پرجایزه',
    icon: Gamepad2,
  },
  {
    id: 'rewards',
    to: '/rewards',
    label: 'خانه جایزه',
    description: 'جوایز روزانه و فصلی',
    icon: Gift,
    comingSoon: true,
  },
  {
    id: 'businesses',
    to: '/businesses',
    label: 'محله کسب‌وکار',
    description: 'کسب‌وکارهای محلی',
    icon: Building2,
  },
  {
    id: 'referrals',
    to: '/referrals',
    label: 'دعوت دوستان',
    description: 'دعوت و کسب جایزه',
    icon: Users,
    comingSoon: true,
  },
];

export const homeAdSlotKeys = [
  'home_hero_1',
  'home_hero_2',
  'home_hero_3',
] as const;
