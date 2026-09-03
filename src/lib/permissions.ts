import type { UserRole, Permission } from '@/types';

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [],
  seller: ['manage_products'],
  admin: [
    'manage_auctions',
    'manage_products',
    'manage_users',
    'manage_wallet',
    'manage_rewards',
    'manage_missions',
    'manage_businesses',
    'manage_content',
    'manage_store_products',
    'manage_store_categories',
    'manage_store_variants',
    'manage_store_media',
    'manage_store_attributes',
    'manage_store_inventory',
    'manage_store_pricing',
  ],
  super_admin: [
    'manage_auctions',
    'manage_products',
    'manage_users',
    'manage_wallet',
    'manage_rewards',
    'manage_missions',
    'manage_businesses',
    'manage_content',
    'manage_settings',
    'manage_store_products',
    'manage_store_categories',
    'manage_store_variants',
    'manage_store_media',
    'manage_store_attributes',
    'manage_store_inventory',
    'manage_store_pricing',
  ],
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((p) => ROLE_PERMISSIONS[role].includes(p));
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role === 'super_admin';
}
