// ============================================================
// CORE SYSTEM v2.1 — Router
// Constitution §6: 4 Roles Only. RoleGuard blocks unauthorized access.
// Constitution §3: features/ MAY import from domain + shared.
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuthStore, selectIsAuthenticated, selectUserRole } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';
import { RoleGuard } from '@/core/permissions/RoleGuard';
import { AuthScreen } from '@/features/auth/AuthScreen';

// Lazy load all feature modules per Constitution §3
const DoctorDashboard = lazy(() => import('@/features/doctor/DoctorLayout'));
const ReceptionDashboard = lazy(() => import('@/features/reception/ReceptionLayout'));
const AdminLayout = lazy(() => import('@/features/clinic-admin/AdminLayout'));
const SuperAdminDashboard = lazy(() => import('@/features/super-admin/SuperAdminLayout'));

// PageLoader — shared component for Suspense fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A]" />
    </div>
  );
}

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
            <Suspense fallback={<PageLoader />}>
              <DoctorDashboard />
            </Suspense>
          </RoleGuard>
        } 
      />

      {/* Reception Routes */}
      <Route 
        path="/reception/*" 
        element={
          <RoleGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <ReceptionDashboard />
            </Suspense>
          </RoleGuard>
        } 
      />

      {/* Clinic Admin Routes */}
      <Route 
        path="/clinic-admin/*" 
        element={
          <RoleGuard allowedRoles={['clinic_admin', 'super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <AdminLayout />
            </Suspense>
          </RoleGuard>
        } 
      />

      {/* Super Admin Routes */}
      <Route 
        path="/super-admin/*" 
        element={
          <RoleGuard allowedRoles={['super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <SuperAdminDashboard />
            </Suspense>
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
