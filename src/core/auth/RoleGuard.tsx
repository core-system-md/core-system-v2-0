import { useAuthStore } from '@/shared/store/authStore';
import type { ReactNode } from 'react';

export type ClinicRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';

export interface RoleGuardProps {
  allowedRoles: ClinicRole[];
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  const user = useAuthStore((s) => s.user);
  const role = user?.role;

  if (!role || !allowedRoles.includes(role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

export function SuperAdminGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['super_admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function AdminGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['super_admin', 'clinic_admin']} fallback={fallback}>{children}</RoleGuard>;
}

export function DoctorGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['doctor']} fallback={fallback}>{children}</RoleGuard>;
}

export function ReceptionistGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['receptionist']} fallback={fallback}>{children}</RoleGuard>;
}

export function MedicalStaffGuard({ children, fallback }: Omit<RoleGuardProps, 'allowedRoles'>) {
  return <RoleGuard allowedRoles={['doctor', 'receptionist']} fallback={fallback}>{children}</RoleGuard>;
}

export function withRoleGuard(allowedRoles: ClinicRole[]) {
  return function <P extends object>(Component: React.ComponentType<P>) {
    return function WrappedComponent(props: P) {
      return (
        <RoleGuard allowedRoles={allowedRoles}>
          <Component {...props} />
        </RoleGuard>
      );
    };
  };
}

export function useRoleGuard() {
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const hasRole = (roles: ClinicRole[]) => {
    if (!isAuthenticated || !user) return false;
    return roles.includes(user.role);
  };

  return { hasRole, role: user?.role, isAuthenticated };
}
