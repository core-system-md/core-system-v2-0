import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';
import type { ClinicRole } from '@/core/auth/RoleGuard';

// ── Lazy-loaded layouts ──
const AdminLayout = lazy(() => import('@/features/clinic-admin/AdminLayout'));
const DoctorLayout = lazy(() => import('@/features/doctor/DoctorLayout'));
const ReceptionLayout = lazy(() => import('@/features/reception/ReceptionLayout'));
const SuperAdminLayout = lazy(() => import('@/features/super-admin/SuperAdminLayout'));

// ── Lazy-loaded pages ──
const AuthScreen = lazy(() => import('@/features/auth/AuthScreen'));

// ── Loading fallback ──
const LoadingFallback = () => (
  <div className="flex h-screen items-center justify-center">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
  </div>
);

// ── Simple dashboard placeholders ──
function AdminDashboard() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Admin Dashboard</h1></div>;
}
function DoctorDashboard() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Doctor Dashboard</h1></div>;
}
function ReceptionDashboard() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Reception Dashboard</h1></div>;
}
function SuperAdminDashboard() {
  return <div className="p-8"><h1 className="text-2xl font-bold">Super Admin Dashboard</h1></div>;
}

// ── Auth wrapper: redirects based on auth state ──
function AuthWrapper() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const status = useAuthStore((s) => s.status);
  const role = useAuthStore((s) => s.user?.role);

  if (status === 'loading') {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Outlet />;
  }

  const defaultRoute = getDefaultRoute(role);
  return <Navigate to={defaultRoute} replace />;
}

// ── Protected wrapper: requires auth + correct role ──
function ProtectedWrapper({ allowedRoles }: { allowedRoles: ClinicRole[] }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const status = useAuthStore((s) => s.status);

  if (status === 'loading') {
    return <LoadingFallback />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (!role || !allowedRoles.includes(role)) {
    const defaultRoute = getDefaultRoute(role);
    return <Navigate to={defaultRoute} replace />;
  }

  return <Outlet />;
}

// ── Router definition ──
const router = createBrowserRouter([
  {
    path: '/login',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <AuthWrapper />
      </Suspense>
    ),
    children: [
      { index: true, element: <AuthScreen /> },
    ],
  },
  {
    path: '/admin',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedWrapper allowedRoles={['clinic_admin', 'super_admin']} />
      </Suspense>
    ),
    children: [
      {
        element: <AdminLayout />,
        children: [{ index: true, element: <AdminDashboard /> }],
      },
    ],
  },
  {
    path: '/doctor',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedWrapper allowedRoles={['doctor']} />
      </Suspense>
    ),
    children: [
      {
        element: <DoctorLayout />,
        children: [{ index: true, element: <DoctorDashboard /> }],
      },
    ],
  },
  {
    path: '/reception',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedWrapper allowedRoles={['receptionist']} />
      </Suspense>
    ),
    children: [
      {
        element: <ReceptionLayout />,
        children: [{ index: true, element: <ReceptionDashboard /> }],
      },
    ],
  },
  {
    path: '/super-admin',
    element: (
      <Suspense fallback={<LoadingFallback />}>
        <ProtectedWrapper allowedRoles={['super_admin']} />
      </Suspense>
    ),
    children: [
      {
        element: <SuperAdminLayout />,
        children: [{ index: true, element: <SuperAdminDashboard /> }],
      },
    ],
  },
  {
    path: '/',
    element: <RootRedirect />,
  },
  {
    path: '*',
    element: <NotFound />,
  },
]);

// ── Root redirect ──
function RootRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const defaultRoute = getDefaultRoute(role);
  return <Navigate to={defaultRoute} replace />;
}

function NotFound() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const defaultRoute = getDefaultRoute(role);
  return <Navigate to={defaultRoute} replace />;
}

// ── Export Router component for App.tsx ──
export function Router() {
  return <RouterProvider router={router} />;
}
