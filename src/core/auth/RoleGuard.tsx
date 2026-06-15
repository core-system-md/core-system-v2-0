// src/core/auth/RoleGuard.tsx
// HOC: blocks render by role

import type { ReactNode } from 'react';
import { useRole } from './useRole';
import type { UserRole } from '../../shared/types/database';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { hasRole } = useRole();
  
  if (!hasRole(allowedRoles)) {
    return fallback ?? (
      <div className="p-8 text-center text-slate-500">
        غير مصرح لك بالوصول إلى هذه الصفحة
      </div>
    );
  }
  
  return <>{children}</>;
}
