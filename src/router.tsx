import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import AuthScreen from '@/components/AuthScreen';
import DoctorPatientList from '@/components/doctor/DoctorPatientList';
import DecisionCard from '@/features/doctor/DecisionCard';

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0f172a]">
      <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
    </div>
  );
}

function AuthGuard({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { isLoading, isAuthenticated, isPinAuthenticated, userRole, role, tenantId } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;
    const isAuth = isAuthenticated || isPinAuthenticated;
    if (!isAuth || !tenantId) { setAuthorized(false); return; }
    setAuthorized(allowedRoles.includes((userRole || role) || ''));
  }, [isLoading, isAuthenticated, isPinAuthenticated, userRole, role, tenantId, allowedRoles]);

  if (isLoading || authorized === null) return <LoadingSpinner />;
  if (!authorized) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function LayoutWrapper() {
  const [LayoutComponent, setLayoutComponent] = useState<any>(null);
  useEffect(() => {
    import('@/shared/components/AppLayout').then((mod) => {
      setLayoutComponent(() => mod.AppLayout);
    }).catch(() => {
      setLayoutComponent(() => ({ children }: { children: React.ReactNode }) => (
        <div className="min-h-screen bg-[#0f172a] text-white" dir="rtl">{children}</div>
      ));
    });
  }, []);
  if (!LayoutComponent) return <LoadingSpinner />;
  const Layout = LayoutComponent;
  return <Layout><Outlet /></Layout>;
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <AuthScreen /> },
  {
    element: <LayoutWrapper />,
    children: [
      {
        path: '/doctor',
        element: <AuthGuard allowedRoles={['doctor', 'receptionist', 'clinic_admin', 'super_admin']}>
          <DoctorPatientList />
        </AuthGuard>
      },
      {
        path: '/doctor/session/:id',
        element: <AuthGuard allowedRoles={['doctor', 'receptionist', 'clinic_admin', 'super_admin']}>
          <DecisionCard />
        </AuthGuard>
      },
      {
        path: '/receptionist',
        element: <AuthGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}>
          <div className="p-8 text-white text-center"><h1 className="text-2xl font-bold mb-4">لوحة الاستقبال</h1><p className="text-white/60">جاري التطوير...</p></div>
        </AuthGuard>
      },
      {
        path: '/clinic_admin',
        element: <AuthGuard allowedRoles={['clinic_admin', 'super_admin']}>
          <div className="p-8 text-white text-center"><h1 className="text-2xl font-bold mb-4">لوحة تحكم العيادة</h1><p className="text-white/60">جاري التطوير...</p></div>
        </AuthGuard>
      },
      {
        path: '/super_admin',
        element: <AuthGuard allowedRoles={['super_admin']}>
          <div className="p-8 text-white text-center"><h1 className="text-2xl font-bold mb-4">لوحة تحكم النظام</h1><p className="text-white/60">جاري التطوير...</p></div>
        </AuthGuard>
      },
    ]
  },
  { path: '*', element: <Navigate to="/login" replace /> }
]);

export default router;