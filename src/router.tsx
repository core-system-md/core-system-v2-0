// ============================================================
// CORE SYSTEM v2.1 — Router Configuration
// Phase 3: Auth State Machine (BOOTING → CHECKING_SESSION → FINAL)
// Date: 2026-07-03
// ============================================================

import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';

// ────────────────────────────────────────────────────────────
// INLINE: LoadingScreen (no external file dependency)
// ────────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1B2A4A] border-t-transparent" />
        <p className="text-sm text-gray-600">جاري التحميل...</p>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────
// LAZY LOAD: Auth
// ────────────────────────────────────────────────────────────
const AuthScreen = lazy(() => import('@/features/auth/AuthScreen'));

// ────────────────────────────────────────────────────────────
// LAZY LOAD: Layouts (Shell wrappers with <Outlet />)
// ────────────────────────────────────────────────────────────
const AdminLayout      = lazy(() => import('@/features/clinic-admin/AdminLayout'));
const DoctorLayout     = lazy(() => import('@/features/doctor/DoctorLayout'));
const ReceptionLayout  = lazy(() => import('@/features/reception/ReceptionLayout'));
const SuperAdminLayout = lazy(() => import('@/features/super-admin/SuperAdminLayout'));

// ────────────────────────────────────────────────────────────
// LAZY LOAD: Role Dashboard Pages (index routes inside layouts)
// ────────────────────────────────────────────────────────────
const AnalyticsOverview = lazy(() => import('@/features/clinic-admin/AnalyticsOverview'));
const DoctorIndex       = lazy(() => import('@/features/doctor/DoctorLayout'));
const ReceptionDashboard = lazy(() => import('@/features/reception/ReceptionDashboard'));
const TenantRegistry    = lazy(() => import('@/features/super-admin/TenantRegistry'));

// ────────────────────────────────────────────────────────────
// WRAPPERS
// ────────────────────────────────────────────────────────────

function AuthWrapper() {
  const { isAuthenticated, user } = useAuthStore();
  if (isAuthenticated && user) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }
  return (
    <Suspense fallback={<LoadingScreen />}>
      <AuthScreen />
    </Suspense>
  );
}

function ProtectedWrapper({ allowedRoles }: { allowedRoles: string[] }) {
  const { status, isAuthenticated, user } = useAuthStore();

  // STATE MACHINE: Never redirect during BOOTING or CHECKING_SESSION
  if (status === 'BOOTING' || status === 'CHECKING_SESSION') {
    return <LoadingScreen />;
  }

  // After CHECKING_SESSION completes, evaluate auth state
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getDefaultRoute(user.role)} replace />;
  }

  return <Outlet />;
}

function RootRedirect() {
  const { status, isAuthenticated, user } = useAuthStore();

  // STATE MACHINE: Wait for session check to complete
  if (status === 'BOOTING' || status === 'CHECKING_SESSION') {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRoute(user.role)} replace />;
}

// ────────────────────────────────────────────────────────────
// ROUTER OBJECT
// ────────────────────────────────────────────────────────────
const router = createBrowserRouter([
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '/login',
    element: <AuthWrapper />,
  },
  // ─── Clinic Admin ─────────────────────────────────────────
  {
    path: '/admin',
    element: <ProtectedWrapper allowedRoles={['clinic_admin']} />,
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <AnalyticsOverview />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  // ─── Doctor ───────────────────────────────────────────────
  {
    path: '/doctor',
    element: <ProtectedWrapper allowedRoles={['doctor']} />,
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <DoctorLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <DoctorIndex />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  // ─── Reception ────────────────────────────────────────────
  {
    path: '/reception',
    element: <ProtectedWrapper allowedRoles={['receptionist']} />,
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ReceptionLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <ReceptionDashboard />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  // ─── Super Admin ──────────────────────────────────────────
  {
    path: '/super-admin',
    element: <ProtectedWrapper allowedRoles={['super_admin']} />,
    children: [
      {
        path: '',
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <SuperAdminLayout />
          </Suspense>
        ),
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <TenantRegistry />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  // ─── Catch-all ────────────────────────────────────────────
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

// ────────────────────────────────────────────────────────────
// ROUTER COMPONENT (exported for App.tsx)
// ────────────────────────────────────────────────────────────
export function Router() {
  return <RouterProvider router={router} />;
}