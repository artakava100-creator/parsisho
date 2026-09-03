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
