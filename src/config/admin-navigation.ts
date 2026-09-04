import {
  LayoutDashboard, Store, Package, FolderTree, Tag, Layers, Image,
  GalleryHorizontalEnd, Sparkles, Boxes, DollarSign, Search, Percent,
  ShoppingCart, Users, Star, Truck, BarChart3, Gavel, Gamepad2, Building2,
  Megaphone, ShieldCheck, KeyRound, ScrollText, Lock, Settings, Activity,
  Crown, Wallet, CreditCard,
} from 'lucide-react';
import type { Permission } from '@/types';

export interface AdminNavItem {
  label: string;
  to: string;
  icon: typeof LayoutDashboard;
  permission?: Permission;
  badge?: string;
}

export interface AdminNavGroup {
  id: string;
  label: string;
  items: AdminNavItem[];
}

export const adminNavGroups: AdminNavGroup[] = [
  {
    id: 'marketplace',
    label: 'مرکز کنترل بازار',
    items: [
      { label: 'نمای کلی', to: '/admin/marketplace', icon: LayoutDashboard },
      { label: 'ویترین فروشگاه', to: '/admin/marketplace/storefront', icon: Store, permission: 'storefront.manage' },
      { label: 'محصولات', to: '/admin/marketplace/products', icon: Package, permission: 'products.manage' },
      { label: 'دسته‌بندی‌ها', to: '/admin/marketplace/categories', icon: FolderTree, permission: 'categories.manage' },
      { label: 'برندها', to: '/admin/marketplace/brands', icon: Tag, permission: 'brands.manage' },
      { label: 'ویژگی‌ها و تنوع‌ها', to: '/admin/marketplace/attributes', icon: Layers, permission: 'attributes.manage' },
      { label: 'رسانه‌ها', to: '/admin/marketplace/media', icon: Image, permission: 'manage_store_media' },
      { label: 'اسلایدشو', to: '/admin/marketplace/slideshow', icon: GalleryHorizontalEnd, permission: 'manage_content' },
      { label: 'مرچندایزینگ', to: '/admin/marketplace/merchandising', icon: Sparkles, permission: 'manage_store_products' },
      { label: 'موجودی', to: '/admin/marketplace/inventory', icon: Boxes, permission: 'manage_store_inventory' },
      { label: 'قیمت‌گذاری', to: '/admin/marketplace/pricing', icon: DollarSign, permission: 'manage_store_pricing' },
      { label: 'جستجو', to: '/admin/marketplace/search', icon: Search, permission: 'manage_content' },
      { label: 'تخفیف‌ها و پروموشن', to: '/admin/marketplace/promotions', icon: Percent, permission: 'manage_store_pricing' },
      { label: 'سفارش‌ها', to: '/admin/marketplace/orders', icon: ShoppingCart, permission: 'manage_store_products' },
      { label: 'فروشندگان', to: '/admin/marketplace/sellers', icon: Users, permission: 'manage_store_products' },
      { label: 'مشتریان', to: '/admin/marketplace/customers', icon: Users, permission: 'manage_users' },
      { label: 'نظرات', to: '/admin/marketplace/reviews', icon: Star, permission: 'manage_content' },
      { label: 'ارسال', to: '/admin/marketplace/shipping', icon: Truck, permission: 'manage_store_products' },
      { label: 'تحلیل‌ها', to: '/admin/marketplace/analytics', icon: BarChart3, permission: 'manage_content' },
      { label: 'مزایده‌ها', to: '/admin/marketplace/auctions', icon: Gavel, permission: 'manage_auctions' },
      { label: 'سرزمین هیجان', to: '/admin/marketplace/engagement', icon: Gamepad2, permission: 'manage_missions' },
      { label: 'کسب‌وکارها', to: '/admin/marketplace/businesses', icon: Building2, permission: 'manage_businesses' },
      { label: 'تبلیغات', to: '/admin/marketplace/ads', icon: Megaphone, permission: 'manage_content' },
    ],
  },
  {
    id: 'system',
    label: 'مدیریت سیستم',
    items: [
      { label: 'کاربران مدیر', to: '/admin/system/admin-users', icon: ShieldCheck, permission: 'manage_users' },
      { label: 'نقش‌ها و دسترسی‌ها', to: '/admin/system/roles', icon: KeyRound, permission: 'manage_settings' },
      { label: 'لاگ ممیزی', to: '/admin/system/audit-log', icon: ScrollText, permission: 'manage_settings' },
      { label: 'امنیت', to: '/admin/system/security', icon: Lock, permission: 'manage_settings' },
      { label: 'تنظیمات', to: '/admin/system/settings', icon: Settings, permission: 'manage_settings' },
      { label: 'سلامت سیستم', to: '/admin/system/health', icon: Activity, permission: 'manage_settings' },
      { label: 'سوپر ادمین', to: '/admin/system/super-admin', icon: Crown, permission: 'manage_settings' },
      { label: 'پکیج‌ها', to: '/admin/system/packages', icon: Wallet, permission: 'manage_wallet' },
      { label: 'پرداخت‌ها', to: '/admin/system/payments', icon: CreditCard, permission: 'manage_wallet' },
    ],
  },
];

export function findNavGroupByPath(pathname: string): AdminNavGroup | null {
  for (const group of adminNavGroups) {
    if (pathname.startsWith(`/admin/${group.id}`)) return group;
  }
  return null;
}

export function findNavItemByPath(pathname: string): AdminNavItem | null {
  for (const group of adminNavGroups) {
    for (const item of group.items) {
      if (pathname === item.to) return item;
    }
  }
  return null;
}
