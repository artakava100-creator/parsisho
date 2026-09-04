import { type ReactNode } from 'react';
import { useAuth } from '@/providers/useAuth';
import { hasPermission, hasAnyPermission } from '@/lib/permissions';
import type { Permission } from '@/types';

interface PermissionGateProps {
  permission?: Permission;
  anyOf?: Permission[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({ permission, anyOf, children, fallback = null }: PermissionGateProps) {
  const { user } = useAuth();

  const allowed = permission
    ? hasPermission(user?.role, permission)
    : anyOf
      ? hasAnyPermission(user?.role, anyOf)
      : true;

  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
