// CORE SYSTEM v2.1 - Role Guard
// Constitution §6: 4 Roles Only (Locked)

import { ReactNode, ComponentType } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './useAuth';

export type ClinicRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface RoleGuardProps {
  children: ReactNode;
  allowedRoles: ClinicRole[];
  fallback?: ReactNode;
}

export function RoleGuard({ children, allowedRoles, fallback }: RoleGuardProps) {
  const { user, isAuthenticated, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  const hasPermission = allowedRoles.includes(user.role as ClinicRole);

  if (!hasPermission) {
    console.warn(`[RoleGuard] Unauthorized: ${user.role} tried to access ${location.pathname}`);
    if (fallback) return <>{fallback}</>;
    const roleRoutes: Record<ClinicRole, string> = {
      doctor: '/doctor',
      receptionist: '/reception',
      clinic_admin: '/admin',
      super_admin: '/super-admin',
    };
    return <Navigate to={roleRoutes[user.role as ClinicRole] || '/auth'} replace />;
  }

  return <>{children}</>;
}

export function withRoleGuard<P extends object>(Component: ComponentType<P>, allowedRoles: ClinicRole[]) {
  return function WrappedComponent(props: P) {
    return (
      <RoleGuard allowedRoles={allowedRoles}>
        <Component {...props} />
      </RoleGuard>
    );
  };
}

export function SuperAdminGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['super_admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function AdminGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['clinic_admin', 'super_admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function DoctorGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['doctor', 'clinic_admin', 'super_admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function ReceptionistGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function MedicalStaffGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['doctor', 'receptionist', 'clinic_admin', 'super_admin']} fallback={fallback}>{children}</RoleGuard>;
}
