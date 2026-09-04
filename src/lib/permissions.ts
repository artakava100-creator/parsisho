import type { UserRole, Permission } from '@/types';

const ALL_PERMISSIONS: Permission[] = [
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
  'manage_store_orders',
  'manage_store_sellers',
  'manage_store_customers',
  'manage_store_reviews',
  'manage_store_shipping',
  'manage_store_analytics',
  'storefront.manage',
  'manage_store_merchandising',
  'manage_store_search',
  'manage_store_promotions',
  'manage_store_brands',
  'manage_store_slideshow',
  'manage_system_admins',
  'manage_system_roles',
  'manage_system_audit',
  'manage_system_security',
  'manage_system_health',
  'manage_system_packages',
  'manage_system_payments',
  'products.manage',
  'categories.manage',
  'brands.manage',
  'attributes.manage',
  'variants.manage',
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  user: [],
  seller: [
    'manage_store_products',
    'manage_store_categories',
    'manage_store_variants',
    'manage_store_media',
    'manage_store_attributes',
    'manage_store_inventory',
    'manage_store_pricing',
    'manage_store_orders',
    'manage_store_shipping',
    'manage_store_analytics',
    'storefront.manage',
    'manage_store_merchandising',
    'manage_store_search',
    'manage_store_promotions',
    'manage_store_brands',
    'manage_store_slideshow',
    'manage_store_reviews',
  ],
  admin: ALL_PERMISSIONS,
  super_admin: ALL_PERMISSIONS,
};

export function hasPermission(role: UserRole | undefined, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

export function hasAnyPermission(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.some((p) => ROLE_PERMISSIONS[role].includes(p));
}

export function hasAllPermissions(role: UserRole | undefined, permissions: Permission[]): boolean {
  if (!role) return false;
  return permissions.every((p) => ROLE_PERMISSIONS[role].includes(p));
}

export function isAdmin(role: UserRole | undefined): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function isSuperAdmin(role: UserRole | undefined): boolean {
  return role === 'super_admin';
}

export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}
