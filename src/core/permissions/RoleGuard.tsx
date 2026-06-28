// ============================================================
// CORE SYSTEM v2.1 — RoleGuard
// SINGLE SOURCE: Reads role from AuthStore (which comes from AuthProvider).
// NO LocalStorage access. NO independent session. NO Context.
// Constitution §6: RoleGuard MUST block unauthorized access at component level.
// ============================================================

import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore, selectUserRole, selectIsAuthenticated } from '@/shared/store/authStore';
import { hasPermission, getDefaultRoute, type Permission } from './permissionMatrix';
import type { UserRole } from '@/shared/types/auth';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
  requiredPermission?: Permission;
  fallback?: React.ReactNode;
  /**
   * If true, redirect to default route instead of showing fallback
   * when permission check fails. Default: false (show fallback or error).
   */
  redirectOnPermissionFail?: boolean;
}

/**
 * RoleGuard — Component-Level Authorization
 * 
 * Usage:
 * <RoleGuard allowedRoles={['doctor', 'clinic_admin']}>
 *   <DoctorDashboard />
 * </RoleGuard>
 * 
 * <RoleGuard requiredPermission="view_invoices">
 *   <InvoicePanel />
 * </RoleGuard>
 */
export function RoleGuard({ 
  children, 
  allowedRoles, 
  requiredPermission,
  fallback,
  redirectOnPermissionFail = false,
}: RoleGuardProps) {
  const location = useLocation();
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectUserRole);

  // 1. Not authenticated → redirect to auth
  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // 2. No role → something is wrong, redirect to auth
  if (!role) {
    console.warn('[RoleGuard] Authenticated but no role found. Redirecting to auth.');
    return <Navigate to="/auth" replace />;
  }

  // 3. Role check
  if (allowedRoles && !allowedRoles.includes(role)) {
    console.warn(`[RoleGuard] Role "${role}" not in allowed roles [${allowedRoles.join(', ')}]. Redirecting.`);
    // Unauthorized role → redirect to role's default route
    const defaultRoute = getDefaultRoute(role);
    return <Navigate to={defaultRoute} replace />;
  }

  // 4. Permission check
  if (requiredPermission && !hasPermission(role, requiredPermission)) {
    console.warn(`[RoleGuard] Role "${role}" lacks permission "${requiredPermission}".`);
    
    if (redirectOnPermissionFail) {
      const defaultRoute = getDefaultRoute(role);
      return <Navigate to={defaultRoute} replace />;
    }
    
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="p-8 text-center">
        <p className="text-red-600 font-semibold">⛔ ليس لديك صلاحية للوصول إلى هذا القسم</p>
        <p className="text-sm text-gray-500 mt-2">الدور المطلوب: {requiredPermission}</p>
      </div>
    );
  }

  // 5. All checks passed → render children
  return <>{children}</>;
}

// ── Convenience HOCs ──

interface GuardProps {
  children: React.ReactNode;
  requiredPermission?: Permission;
}

export function DoctorGuard({ children, requiredPermission }: GuardProps) {
  return (
    <RoleGuard 
      allowedRoles={['doctor', 'clinic_admin', 'super_admin']}
      requiredPermission={requiredPermission}
    >
      {children}
    </RoleGuard>
  );
}

export function AdminGuard({ children, requiredPermission }: GuardProps) {
  return (
    <RoleGuard 
      allowedRoles={['clinic_admin', 'super_admin']}
      requiredPermission={requiredPermission}
    >
      {children}
    </RoleGuard>
  );
}

export function SuperAdminGuard({ children, requiredPermission }: GuardProps) {
  return (
    <RoleGuard 
      allowedRoles={['super_admin']}
      requiredPermission={requiredPermission}
    >
      {children}
    </RoleGuard>
  );
}

export function ReceptionGuard({ children, requiredPermission }: GuardProps) {
  return (
    <RoleGuard 
      allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}
      requiredPermission={requiredPermission}
    >
      {children}
    </RoleGuard>
  );
}
