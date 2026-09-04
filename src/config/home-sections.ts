import type { LucideIcon } from 'lucide-react';
import {
  Gavel, Store, Wallet, Trophy, Gamepad2, Gift, Users, Building2,
  ShoppingBag, Sparkles, Star, Clock, Flame, Compass,
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

export interface QuickAccessConfigItem {
  id: string;
  label: string;
  link: string;
  icon: string;
  active: boolean;
  sort_order: number;
}

export interface QuickAccessConfig {
  items: QuickAccessConfigItem[];
}

export const quickAccessIconMap: Record<string, LucideIcon> = {
  gavel: Gavel,
  store: Store,
  shoppingBag: ShoppingBag,
  gamepad: Gamepad2,
  building: Building2,
  wallet: Wallet,
  trophy: Trophy,
  gift: Gift,
  users: Users,
  sparkles: Sparkles,
  star: Star,
  clock: Clock,
  flame: Flame,
  compass: Compass,
};

export const quickAccessIconOptions: { value: string; label: string }[] = [
  { value: 'gavel', label: 'چکش مزایده' },
  { value: 'store', label: 'فروشگاه' },
  { value: 'shoppingBag', label: 'کیف خرید' },
  { value: 'gamepad', label: 'بازی' },
  { value: 'building', label: 'ساختمان' },
  { value: 'wallet', label: 'کیف پول' },
  { value: 'trophy', label: 'جام' },
  { value: 'gift', label: 'هدیه' },
  { value: 'users', label: 'کاربران' },
  { value: 'sparkles', label: 'درخشش' },
  { value: 'star', label: 'ستاره' },
  { value: 'clock', label: 'ساعت' },
  { value: 'flame', label: 'آتش' },
  { value: 'compass', label: 'قطب‌نما' },
];

export const defaultQuickAccessItems: QuickAccessConfigItem[] = [
  { id: 'auction-hall', label: 'تالار مزایده', link: '/auctions', icon: 'gavel', active: true, sort_order: 1 },
  { id: 'marketplace', label: 'بازارگردی', link: '/market', icon: 'store', active: true, sort_order: 2 },
  { id: 'excitement', label: 'سرزمین هیجان', link: '/excitement', icon: 'gamepad', active: true, sort_order: 3 },
  { id: 'businesses', label: 'محله کسب و کار', link: '/businesses', icon: 'building', active: true, sort_order: 4 },
];

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
