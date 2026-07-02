// ============================================================
// CORE SYSTEM v2.1 — Router
// Constitution §6: 4 Roles Only. RoleGuard blocks unauthorized access.
// Constitution §3: features/ MAY import from domain + shared.
// FIXED: 2026-07-01 — Added FeatureFlagGuard, fixed route redirects
// ============================================================

import { Routes, Route, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import { useAuthStore, selectIsAuthenticated, selectUserRole } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';
import { RoleGuard } from '@/core/auth/RoleGuard';
import AuthScreen from '@/features/auth/AuthScreen';

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

/**
 * FeatureFlagGuard — checks if a feature is enabled before rendering route.
 * Falls back to default route if feature is disabled.
 * TODO: Connect to featureFlagStore when implemented.
 */
function FeatureFlagGuard({ 
  children,
}: { 
  children: React.ReactNode;
}) {
  // For now, all features are enabled. 
  const isEnabled = true; 
  if (!isEnabled) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
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
            <FeatureFlagGuard>
              <Suspense fallback={<PageLoader />}>
                <DoctorDashboard />
              </Suspense>
            </FeatureFlagGuard>
          </RoleGuard>
        } 
      />

      {/* Reception Routes */}
      <Route 
        path="/reception/*" 
        element={
          <RoleGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}>
            <FeatureFlagGuard>
              <Suspense fallback={<PageLoader />}>
                <ReceptionDashboard />
              </Suspense>
            </FeatureFlagGuard>
          </RoleGuard>
        } 
      />

      {/* Clinic Admin Routes */}
      <Route 
        path="/clinic-admin/*" 
        element={
          <RoleGuard allowedRoles={['clinic_admin', 'super_admin']}>
            <FeatureFlagGuard>
              <Suspense fallback={<PageLoader />}>
                <AdminLayout />
              </Suspense>
            </FeatureFlagGuard>
          </RoleGuard>
        } 
      />

      {/* Super Admin Routes */}
      <Route 
        path="/super-admin/*" 
        element={
          <RoleGuard allowedRoles={['super_admin']}>
            <FeatureFlagGuard>
              <Suspense fallback={<PageLoader />}>
                <SuperAdminDashboard />
              </Suspense>
            </FeatureFlagGuard>
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
