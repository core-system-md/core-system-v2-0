import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import AppLayout from '@/components/AppLayout';
import AuthGuard from '@/core/auth/RoleGuard';

// Lazy load all feature modules per Constitution §3
const AuthScreen = lazy(() => import('@/features/auth/AuthScreen'));
const DoctorPatientList = lazy(() => import('@/components/doctor/DoctorPatientList'));
const DecisionCard = lazy(() => import('@/components/doctor/DecisionCard'));
const SimpleInvoice = lazy(() => import('@/components/doctor/SimpleInvoice'));
const ReceptionDashboard = lazy(() => import('@/features/reception/ReceptionDashboard'));
const AdminDashboard = lazy(() => import('@/features/clinic-admin/AdminDashboard'));
const SuperAdminLayout = lazy(() => import('@/features/super-admin/SuperAdminLayout'));
const TenantRegistry = lazy(() => import('@/features/super-admin/TenantRegistry'));
const FeatureFlagManager = lazy(() => import('@/features/super-admin/FeatureFlagManager'));
const AmbientKioskView = lazy(() => import('@/components/AmbientKioskView'));

function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center" dir="rtl">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1B2A4A]" />
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AuthScreen />
      </Suspense>
    ),
  },
  {
    path: '/kiosk',
    element: (
      <Suspense fallback={<PageLoader />}>
        <AmbientKioskView />
      </Suspense>
    ),
  },
  {
    path: '/',
    element: <AppLayout />,
    children: [
      // Doctor routes
      {
        path: 'doctor',
        element: (
          <AuthGuard allowedRoles={['doctor', 'clinic_admin', 'super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <DoctorPatientList />
            </Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'doctor/session/:sessionId',
        element: (
          <AuthGuard allowedRoles={['doctor', 'clinic_admin', 'super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <DecisionCard />
            </Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'doctor/invoice/:sessionId',
        element: (
          <AuthGuard allowedRoles={['doctor', 'clinic_admin', 'super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <SimpleInvoice />
            </Suspense>
          </AuthGuard>
        ),
      },
      // Reception routes
      {
        path: 'receptionist',
        element: (
          <AuthGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <ReceptionDashboard />
            </Suspense>
          </AuthGuard>
        ),
      },
      // Clinic Admin routes
      {
        path: 'clinic_admin',
        element: (
          <AuthGuard allowedRoles={['clinic_admin', 'super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <AdminDashboard />
            </Suspense>
          </AuthGuard>
        ),
      },
      // Super Admin routes
      {
        path: 'super_admin',
        element: (
          <AuthGuard allowedRoles={['super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <SuperAdminLayout />
            </Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'super_admin/tenants',
        element: (
          <AuthGuard allowedRoles={['super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <TenantRegistry />
            </Suspense>
          </AuthGuard>
        ),
      },
      {
        path: 'super_admin/features',
        element: (
          <AuthGuard allowedRoles={['super_admin']}>
            <Suspense fallback={<PageLoader />}>
              <FeatureFlagManager />
            </Suspense>
          </AuthGuard>
        ),
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />,
  },
]);