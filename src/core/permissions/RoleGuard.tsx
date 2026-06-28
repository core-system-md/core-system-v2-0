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
  fallback 
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
    return <Navigate to="/auth" replace />;
  }

  // 3. Role check
  if (allowedRoles && !allowedRoles.includes(role)) {
    // Unauthorized role → redirect to role's default route
    const defaultRoute = getDefaultRoute(role);
    return <Navigate to={defaultRoute} replace />;
  }

  // 4. Permission check
  if (requiredPermission && !hasPermission(role, requiredPermission)) {
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

export function DoctorGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['doctor', 'clinic_admin', 'super_admin']}>
      {children}
    </RoleGuard>
  );
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['clinic_admin', 'super_admin']}>
      {children}
    </RoleGuard>
  );
}

export function SuperAdminGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['super_admin']}>
      {children}
    </RoleGuard>
  );
}

export function ReceptionGuard({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}>
      {children}
    </RoleGuard>
  );
}
