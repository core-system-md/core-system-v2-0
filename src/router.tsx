import { Suspense, lazy } from 'react';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <div className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-gray-600">جاري التحميل...</p>
      </div>
    </div>
  );
}

const AuthScreen = lazy(() => import('@/features/auth/AuthScreen'));
const AmbientKioskView = lazy(() => import('@/components/AmbientKioskView'));
const AdminLayout = lazy(() => import('@/features/clinic-admin/AdminLayout'));
const DoctorLayout = lazy(() => import('@/features/doctor/DoctorLayout'));
const ReceptionLayout = lazy(() => import('@/features/reception/ReceptionLayout'));
const SuperAdminLayout = lazy(() => import('@/features/super-admin/SuperAdminLayout'));

const DoctorTodayPatients = lazy(() => import('@/features/doctor/DoctorTodayPatients'));
const DoctorSessionView = lazy(() => import('@/features/doctor/DoctorSessionView'));
const ReceptionDashboard = lazy(() => import('@/features/reception/ReceptionDashboard'));
const AdminOverviewPage = lazy(() => import('@/features/clinic-admin/AdminOverviewPage'));
const AdminRevenuePage = lazy(() => import('@/features/clinic-admin/AdminRevenuePage'));
const AdminStaffPage = lazy(() => import('@/features/clinic-admin/AdminStaffPage'));
const AdminSchedulePage = lazy(() => import('@/features/clinic-admin/AdminSchedulePage'));
const AdminPatientsPage = lazy(() => import('@/features/clinic-admin/AdminPatientsPage'));
const AuditTrailViewerPage = lazy(() => import('@/features/clinic-admin/AuditTrailViewerPage'));
const BreachLogPage = lazy(() => import('@/features/clinic-admin/BreachLogPage'));
const BillingStatusPage = lazy(() => import('@/features/clinic-admin/BillingStatusPage'));
const TenantRegistry = lazy(() => import('@/features/super-admin/TenantRegistry'));
const FeatureFlagManager = lazy(() => import('@/features/super-admin/FeatureFlagManager'));
const CoreRulesConfigManager = lazy(() => import('@/features/super-admin/CoreRulesConfigManager'));
const TenantBillingAdminPage = lazy(() => import('@/features/super-admin/TenantBillingAdminPage'));
const SurveyRouter = lazy(() => import('@/features/survey/SurveyRouter'));

function AuthWrapper() {
  const { status, isAuthenticated, user } = useAuthStore();
  if (status === 'BOOTING' || status === 'CHECKING_SESSION') return <LoadingScreen />;
  if (isAuthenticated && user && !user.role) return <Navigate to="/login/roles" replace />;
  return <Suspense fallback={<LoadingScreen />}><AuthScreen /></Suspense>;
}

function ProtectedWrapper({ allowedRoles }: { allowedRoles: string[] }) {
  const { status, isAuthenticated, user } = useAuthStore();
  if (status === 'BOOTING' || status === 'CHECKING_SESSION') return <LoadingScreen />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  if (!allowedRoles.includes(user.role)) return <Navigate to={getDefaultRoute(user.role)} replace />;
  return <Outlet />;
}

function RootRedirect() {
  const { status, isAuthenticated, user } = useAuthStore();
  if (status === 'BOOTING' || status === 'CHECKING_SESSION') return <LoadingScreen />;
  if (!isAuthenticated || !user) return <Navigate to="/login" replace />;
  return <Navigate to={getDefaultRoute(user.role)} replace />;
}

const router = createBrowserRouter([
  { path: '/', element: <RootRedirect /> },
  { path: '/kiosk', element: <Suspense fallback={<LoadingScreen />}><AmbientKioskView /></Suspense> },
  {
    path: '/login',
    element: <AuthWrapper />,
    children: [
      { index: true, element: <Suspense fallback={<LoadingScreen />}><AuthScreen /></Suspense> },
      { path: 'roles', element: <Navigate to="/login" replace /> },
    ],
  },
  {
    path: '/admin',
    element: <Suspense fallback={<LoadingScreen />}><ProtectedWrapper allowedRoles={['clinic_admin', 'super_admin']} /></Suspense>,
    children: [{
      element: <Suspense fallback={<LoadingScreen />}><AdminLayout /></Suspense>,
      children: [
        { index: true, element: <Suspense fallback={<LoadingScreen />}><AdminOverviewPage /></Suspense> },
        { path: 'revenue', element: <Suspense fallback={<LoadingScreen />}><AdminRevenuePage /></Suspense> },
        { path: 'staff', element: <Suspense fallback={<LoadingScreen />}><AdminStaffPage /></Suspense> },
        { path: 'schedule', element: <Suspense fallback={<LoadingScreen />}><AdminSchedulePage /></Suspense> },
        { path: 'patients', element: <Suspense fallback={<LoadingScreen />}><AdminPatientsPage /></Suspense> },
        { path: 'audit', element: <Suspense fallback={<LoadingScreen />}><AuditTrailViewerPage /></Suspense> },
        { path: 'breaches', element: <Suspense fallback={<LoadingScreen />}><BreachLogPage /></Suspense> },
        { path: 'billing', element: <Suspense fallback={<LoadingScreen />}><BillingStatusPage /></Suspense> },
      ],
    }],
  },
  {
    path: '/doctor',
    element: <Suspense fallback={<LoadingScreen />}><ProtectedWrapper allowedRoles={['doctor', 'clinic_admin', 'super_admin']} /></Suspense>,
    children: [{
      element: <Suspense fallback={<LoadingScreen />}><DoctorLayout /></Suspense>,
      children: [
        { index: true, element: <Suspense fallback={<LoadingScreen />}><DoctorTodayPatients /></Suspense> },
        { path: 'session/:sessionId', element: <Suspense fallback={<LoadingScreen />}><DoctorSessionView /></Suspense> },
      ],
    }],
  },
  {
    path: '/reception',
    element: <Suspense fallback={<LoadingScreen />}><ProtectedWrapper allowedRoles={['receptionist', 'clinic_admin', 'super_admin']} /></Suspense>,
    children: [{
      element: <Suspense fallback={<LoadingScreen />}><ReceptionLayout /></Suspense>,
      children: [
        { index: true, element: <Suspense fallback={<LoadingScreen />}><ReceptionDashboard /></Suspense> },
      ],
    }],
  },
  {
    path: '/super-admin',
    element: <Suspense fallback={<LoadingScreen />}><ProtectedWrapper allowedRoles={['super_admin']} /></Suspense>,
    children: [{
      element: <Suspense fallback={<LoadingScreen />}><SuperAdminLayout /></Suspense>,
      children: [
        { index: true, element: <Suspense fallback={<LoadingScreen />}><TenantRegistry /></Suspense> },
        { path: 'feature-flags', element: <Suspense fallback={<LoadingScreen />}><FeatureFlagManager /></Suspense> },
        { path: 'core-rules', element: <Suspense fallback={<LoadingScreen />}><CoreRulesConfigManager /></Suspense> },
        { path: 'billing', element: <Suspense fallback={<LoadingScreen />}><TenantBillingAdminPage /></Suspense> },
      ],
    }],
  },
  {
    path: '/survey/:sessionId',
    element: <Suspense fallback={<LoadingScreen />}><SurveyRouter /></Suspense>,
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

export function Router() {
  return <RouterProvider router={router} />;
}