// ============================================================
// CORE SYSTEM v2.1 — Router
// Constitution §6: 4 Roles Only. RoleGuard blocks unauthorized access.
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, selectIsAuthenticated, selectUserRole } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';
import { AuthScreen } from '@/features/auth/AuthScreen';
import { RoleGuard } from '@/core/permissions/RoleGuard';

// Lazy-loaded role dashboards (Constitution: features/ MAY import from domain + shared)
const DoctorDashboard = () => import('@/features/doctor/DoctorLayout');
const ReceptionDashboard = () => import('@/features/reception/ReceptionLayout');
const ClinicAdminDashboard = () => import('@/features/clinic-admin/AdminLayout');
const SuperAdminDashboard = () => import('@/features/super-admin/SuperAdminLayout');

export function Router() {
  const isAuthenticated = useAuthStore(selectIsAuthenticated);
  const role = useAuthStore(selectUserRole);

  return (
    <Routes>
      {/* Public Route */}
      <Route 
        path="/auth" 
        element={isAuthenticated ? <Navigate to={getDefaultRoute(role)} replace /> : <AuthScreen />} 
      />

      {/* Doctor Routes */}
      <Route 
        path="/doctor/*" 
        element={
          <RoleGuard allowedRoles={['doctor', 'clinic_admin', 'super_admin']}>
            <DoctorDashboard />
          </RoleGuard>
        } 
      />

      {/* Reception Routes */}
      <Route 
        path="/reception/*" 
        element={
          <RoleGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}>
            <ReceptionDashboard />
          </RoleGuard>
        } 
      />

      {/* Clinic Admin Routes */}
      <Route 
        path="/clinic-admin/*" 
        element={
          <RoleGuard allowedRoles={['clinic_admin', 'super_admin']}>
            <ClinicAdminDashboard />
          </RoleGuard>
        } 
      />

      {/* Super Admin Routes */}
      <Route 
        path="/super-admin/*" 
        element={
          <RoleGuard allowedRoles={['super_admin']}>
            <SuperAdminDashboard />
          </RoleGuard>
        } 
      />

      {/* Default: redirect based on auth state */}
      <Route 
        path="*" 
        element={
          isAuthenticated 
            ? <Navigate to={getDefaultRoute(role)} replace />
            : <Navigate to="/auth" replace />
        } 
      />
    </Routes>
  );
}
