// ============================================================
// CORE SYSTEM v2.1 — Router Configuration
// FIXED: 2026-07-06 — Screen Rendering + Outlet Issue
// Changes:
//   - DoctorIndex → DoctorTodayPatients (fixed self-import)
//   - All Layouts: UI shell + <Outlet /> (kept navigation)
//   - Admin: added /admin/revenue and /admin/staff routes
//   - /doctor/session/:sessionId nested under /doctor
//   - No Layout used as Page anywhere
// ============================================================

import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';

// ────────────────────────────────────────────────────────────
// INLINE: LoadingScreen
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
// LAZY LOAD: Layouts (UI shell with <Outlet />)
// ────────────────────────────────────────────────────────────
const AdminLayout      = lazy(() => import('@/features/clinic-admin/AdminLayout'));
const DoctorLayout     = lazy(() => import('@/features/doctor/DoctorLayout'));
const ReceptionLayout  = lazy(() => import('@/features/reception/ReceptionLayout'));
const SuperAdminLayout = lazy(() => import('@/features/super-admin/SuperAdminLayout'));

// ────────────────────────────────────────────────────────────
// LAZY LOAD: Page Components (real pages, NOT layouts)
// ────────────────────────────────────────────────────────────
const DoctorTodayPatients = lazy(() => import('@/features/doctor/DoctorTodayPatients'));
const DoctorSessionView   = lazy(() => import('@/features/doctor/DoctorSessionView'));
const ReceptionDashboard  = lazy(() => import('@/features/reception/ReceptionDashboard'));
const AdminOverviewPage   = lazy(() => import('@/features/clinic-admin/AdminOverviewPage'));
const AdminRevenuePage    = lazy(() => import('@/features/clinic-admin/AdminRevenuePage'));
const AdminStaffPage      = lazy(() => import('@/features/clinic-admin/AdminStaffPage'));
const TenantRegistry      = lazy(() => import('@/features/super-admin/TenantRegistry'));

// ────────────────────────────────────────────────────────────
// WRAPPERS
// ────────────────────────────────────────────────────────────

function AuthWrapper() {
  const { status, isAuthenticated, user } = useAuthStore();

  if (status === 'BOOTING' || status === 'CHECKING_SESSION') {
    return <LoadingScreen />;
  }

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

  if (status === 'BOOTING' || status === 'CHECKING_SESSION') {
    return <LoadingScreen />;
  }

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

  if (status === 'BOOTING' || status === 'CHECKING_SESSION') {
    return <LoadingScreen />;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getDefaultRoute(user.role)} replace />;
}

// ────────────────────────────────────────────────────────────
// ROUTER OBJECT — FIXED: Layout → Outlet → Page
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
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <ProtectedWrapper allowedRoles={['clinic_admin', 'super_admin']} />
      </Suspense>
    ),
    children: [
      {
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <AdminLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <Suspense fallback={<LoadingScreen />}><AdminOverviewPage /></Suspense> },
          { path: 'revenue', element: <Suspense fallback={<LoadingScreen />}><AdminRevenuePage /></Suspense> },
          { path: 'staff', element: <Suspense fallback={<LoadingScreen />}><AdminStaffPage /></Suspense> },
        ],
      },
    ],
  },
  // ─── Doctor ───────────────────────────────────────────────
  {
    path: '/doctor',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <ProtectedWrapper allowedRoles={['doctor']} />
      </Suspense>
    ),
    children: [
      {
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <DoctorLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <Suspense fallback={<LoadingScreen />}><DoctorTodayPatients /></Suspense> },
          { path: 'session/:sessionId', element: <Suspense fallback={<LoadingScreen />}><DoctorSessionView /></Suspense> },
        ],
      },
    ],
  },
  // ─── Reception ────────────────────────────────────────────
  {
    path: '/reception',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <ProtectedWrapper allowedRoles={['receptionist']} />
      </Suspense>
    ),
    children: [
      {
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <ReceptionLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <Suspense fallback={<LoadingScreen />}><ReceptionDashboard /></Suspense> },
        ],
      },
    ],
  },
  // ─── Super Admin ──────────────────────────────────────────
  {
    path: '/super-admin',
    element: (
      <Suspense fallback={<LoadingScreen />}>
        <ProtectedWrapper allowedRoles={['super_admin']} />
      </Suspense>
    ),
    children: [
      {
        element: (
          <Suspense fallback={<LoadingScreen />}>
            <SuperAdminLayout />
          </Suspense>
        ),
        children: [
          { index: true, element: <Suspense fallback={<LoadingScreen />}><TenantRegistry /></Suspense> },
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
// ROUTER COMPONENT
// ────────────────────────────────────────────────────────────
export function Router() {
  return <RouterProvider router={router} />;
}