import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import App from '@/App';
import LoadingScreen from '@/shared/components/LoadingScreen';

// ─── Lazy Feature Pages ──────────────────────────────────────────
const AuthScreen = lazy(() => import('@/features/auth/AuthScreen'));
const ReceptionDashboard = lazy(() => import('@/features/reception/ReceptionDashboard'));
const AdminLayout = lazy(() => import('@/features/clinic-admin/AdminLayout'));
const SuperAdminLayout = lazy(() => import('@/features/super-admin/SuperAdminLayout'));
const TenantRegistry = lazy(() => import('@/features/super-admin/TenantRegistry'));
const AnalyticsOverview = lazy(() => import('@/features/clinic-admin/AnalyticsOverview'));
const DoctorIndex = lazy(() => import('@/features/doctor/DoctorLayout'));
const DoctorSessionView = lazy(() => import('@/features/doctor/DoctorSessionView'));

// ─── Route Guards ────────────────────────────────────────────────
function ProtectedWrapper({ allowedRoles }: { allowedRoles: string[] }) {
  const { status, user } = useAuthStore();
  const userRole = user?.role;

  if (status === 'BOOTING' || status === 'CHECKING_SESSION') {
    return <LoadingScreen />;
  }

  if (status === 'UNAUTHENTICATED' || status === 'PIN_REQUIRED') {
    return <Navigate to="/auth" replace />;
  }

  if (status === 'LOCKED') {
    return <div>Account locked. Contact admin.</div>;
  }

  if (!userRole || !allowedRoles.includes(userRole)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}

function PublicOnlyWrapper() {
  const { status } = useAuthStore();

  if (status === 'BOOTING' || status === 'CHECKING_SESSION') {
    return <LoadingScreen />;
  }

  if (status === 'AUTHENTICATED') {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

// ─── Router Definition ───────────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <Navigate to="/auth" replace />,
      },
      {
        path: 'auth',
        element: <PublicOnlyWrapper />,
        children: [
          {
            path: '',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <AuthScreen />
              </Suspense>
            ),
          },
        ],
      },
      // ─── Doctor ───────────────────────────────────────────────
      {
        path: '/doctor',
        element: <ProtectedWrapper allowedRoles={['doctor']} />,
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
      // ─── Doctor Session Detail ────────────────────────────────
      {
        path: '/doctor/session/:sessionId',
        element: <ProtectedWrapper allowedRoles={['doctor']} />,
        children: [
          {
            path: '',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <DoctorSessionView />
              </Suspense>
            ),
          },
        ],
      },
      // ─── Reception ────────────────────────────────────────────
      {
        path: '/reception',
        element: <ProtectedWrapper allowedRoles={['receptionist', 'clinic_admin']} />,
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
      // ─── Clinic Admin ─────────────────────────────────────────
      {
        path: '/admin',
        element: <ProtectedWrapper allowedRoles={['clinic_admin']} />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <AdminLayout />
              </Suspense>
            ),
          },
          {
            path: 'analytics',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <AnalyticsOverview />
              </Suspense>
            ),
          },
        ],
      },
      // ─── Super Admin ──────────────────────────────────────────
      {
        path: '/super-admin',
        element: <ProtectedWrapper allowedRoles={['super_admin']} />,
        children: [
          {
            index: true,
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <SuperAdminLayout />
              </Suspense>
            ),
          },
          {
            path: 'tenants',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <TenantRegistry />
              </Suspense>
            ),
          },
        ],
      },
      // ─── Unauthorized ─────────────────────────────────────────
      {
        path: '/unauthorized',
        element: <div className="p-8 text-center">Unauthorized access</div>,
      },
      // ─── Catch All ────────────────────────────────────────────
      {
        path: '*',
        element: <Navigate to="/auth" replace />,
      },
    ],
  },
]);