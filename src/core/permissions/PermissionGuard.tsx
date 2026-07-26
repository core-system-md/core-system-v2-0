import type { ReactNode } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { hasPermission, type Permission } from './permissionMatrix';

export interface PermissionGuardProps {
  required: Permission;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGuard({ required, children, fallback = null }: PermissionGuardProps) {
  const role = useAuthStore((s) => s.user?.role);
  const allowed = hasPermission(role, required);

  if (!allowed) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
