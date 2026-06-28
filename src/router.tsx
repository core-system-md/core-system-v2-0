// src/core/permissions/RoleGuard.tsx
import { Navigate } from 'react-router-dom';
import { useAuthStore, RoleId } from '@/shared/store/authStore';

interface RoleGuardProps {
  children: React.ReactNode;
  allowedRoles: RoleId[];
}

export function RoleGuard({ children, allowedRoles }: RoleGuardProps) {
  const user = useAuthStore(state => state.user);
  const isAuthenticated = useAuthStore(state => state.selectIsAuthenticated());

  // If not authenticated, kick to login
  if (!isAuthenticated || !user) {
    return <Navigate to="/auth" replace />;
  }

  // If user's role is not in the allowed list, kick to unauthorized or default route
  if (!allowedRoles.includes(user.role)) {
    // For now, redirect back to auth. Can be changed to an /unauthorized screen later.
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}
