import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/providers/useAuth';
import { FullPageSpinner } from '@/components/ui/Spinner';
import { hasPermission, hasAnyPermission, isAdmin } from '@/lib/permissions';
import type { Permission, UserRole } from '@/types';

interface GuardProps {
  children: ReactNode;
}

export function ProtectedRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageSpinner label="در حال بررسی نشست..." />;
  if (!isAuthenticated) {
    return <Navigate to="/auth/sign-in" state={{ from: location.pathname }} replace />;
  }
  return <>{children}</>;
}

export function PublicOnlyRoute({ children }: GuardProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="در حال بارگذاری..." />;
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
}

interface RoleGuardProps extends GuardProps {
  permission?: Permission;
  role?: UserRole;
}

export function RoleRoute({ children, permission, role }: RoleGuardProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="در حال بررسی دسترسی..." />;
  if (!user) return <Navigate to="/auth/sign-in" replace />;

  if (role && user.role !== role) return <Navigate to="/" replace />;
  if (permission && !hasPermission(user.role, permission)) return <Navigate to="/" replace />;

  return <>{children}</>;
}

interface AdminRouteProps extends GuardProps {
  permission?: Permission;
  anyOf?: Permission[];
}

export function AdminRoute({ children, permission, anyOf }: AdminRouteProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) return <FullPageSpinner label="در حال بررسی دسترسی..." />;
  if (!user || !isAdmin(user.role)) return <Navigate to="/" replace />;

  if (permission && !hasPermission(user.role, permission)) return <Navigate to="/admin" replace />;
  if (anyOf && !hasAnyPermission(user.role, anyOf)) return <Navigate to="/admin" replace />;

  return <>{children}</>;
}
