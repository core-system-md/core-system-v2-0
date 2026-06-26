import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { AppLayout } from '@/shared/components/AppLayout';
import AuthScreen from '@/components/AuthScreen';
import DoctorPatientList from '@/components/doctor/DoctorPatientList';
import DecisionCard from '@/components/doctor/DecisionCard';
import SimpleInvoice from '@/features/doctor/SimpleInvoice';
import ReceptionDashboard from '@/features/reception/ReceptionDashboard';
import ClinicAdminDashboard from '@/features/clinic-admin/ClinicAdminDashboard';
import SuperAdminDashboard from '@/features/super-admin/SuperAdminDashboard';
import FeatureFlagManager from '@/features/super-admin/FeatureFlagManager';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0f172a]">
      <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
    </div>
  );
}

function AuthGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isLoading, isAuthenticated, isPinAuthenticated, userRole, role } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const localTenantId = localStorage.getItem('tenant_id');
    const localPinData = localStorage.getItem('core_pin_auth');
    let localRole = null;
    let hasLocalAuth = false;
    if (localPinData) {
      try {
        const parsed = JSON.parse(localPinData);
        if (parsed.expiry && Date.now() < parsed.expiry) {
          localRole = parsed.role;
          hasLocalAuth = true;
        }
      } catch { /* ignore */ }
    }
    const effectiveTenantId = localTenantId;
    const effectiveRole = userRole || role || localRole;
    const isAuth = isAuthenticated || isPinAuthenticated || hasLocalAuth;

    if (!isAuth || !effectiveTenantId) {
      setAuthorized(false);
      return;
    }
    setAuthorized(allowedRoles.includes(effectiveRole || ''));
  }, [isLoading, isAuthenticated, isPinAuthenticated, userRole, role, allowedRoles]);

  if (isLoading || authorized === null) return <LoadingSpinner />;
  if (!authorized) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <AuthScreen /> },
  {
    element: <AuthenticatedLayout />,
    children: [
      { path: '/doctor', element: <AuthGuard allowedRoles={['doctor','receptionist','clinic_admin','super_admin']}><DoctorPatientList /></AuthGuard> },
      { path: '/doctor/session/:id', element: <AuthGuard allowedRoles={['doctor','receptionist','clinic_admin','super_admin']}><DecisionCard /></AuthGuard> },
      { path: '/doctor/invoice/:sessionId', element: <AuthGuard allowedRoles={['doctor','receptionist','clinic_admin','super_admin']}><SimpleInvoice /></AuthGuard> },
      { path: '/receptionist', element: <AuthGuard allowedRoles={['receptionist','clinic_admin','super_admin']}><ReceptionDashboard /></AuthGuard> },
      { path: '/clinic_admin', element: <AuthGuard allowedRoles={['clinic_admin','super_admin']}><ClinicAdminDashboard /></AuthGuard> },
      { path: '/super_admin', element: <AuthGuard allowedRoles={['super_admin']}><SuperAdminDashboard /></AuthGuard> },
      { path: '/super_admin/features', element: <AuthGuard allowedRoles={['super_admin']}><FeatureFlagManager /></AuthGuard> },
    ]
  },
  { path: '*', element: <Navigate to="/login" replace /> }
]);

export default router;