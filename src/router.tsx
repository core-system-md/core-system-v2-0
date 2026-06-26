// ============================================================
// CORE SYSTEM v2.1 — Router Configuration
// FIXED: 2026-06-26 — Direct AppLayout import + AuthGuard fallback
// ============================================================

import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '@/core/auth/AuthProvider';
import { AppLayout } from '@/shared/components/AppLayout';
import AuthScreen from '@/components/AuthScreen';

import DoctorPatientList from '@/components/doctor/DoctorPatientList';
import DecisionCard from '@/features/doctor/DecisionCard';

// ── Loading Spinner ──────────────────────────────────────
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center h-screen bg-[#0f172a]">
      <div className="animate-spin h-8 w-8 border-4 border-white border-t-transparent rounded-full" />
    </div>
  );
}

// ── CRITICAL FIX: AuthGuard with localStorage fallback ───
function AuthGuard({ children, allowedRoles }: {
  children: React.ReactNode;
  allowedRoles: string[];
}) {
  const { isLoading, isAuthenticated, isPinAuthenticated, userRole, role, tenantId } = useAuth();
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    if (isLoading) return;

    // CRITICAL FIX: Check localStorage as fallback for tenantId
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

    // Use context OR localStorage
    const effectiveTenantId = tenantId || localTenantId;
    const effectiveRole = userRole || role || localRole;
    const isAuth = isAuthenticated || isPinAuthenticated || hasLocalAuth;

    if (!isAuth || !effectiveTenantId) {
      setAuthorized(false);
      return;
    }

    setAuthorized(allowedRoles.includes(effectiveRole || ''));
  }, [isLoading, isAuthenticated, isPinAuthenticated, userRole, role, tenantId, allowedRoles]);

  if (isLoading || authorized === null) {
    return <LoadingSpinner />;
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── CRITICAL FIX: Layout with direct import (no dynamic import) ─
function AuthenticatedLayout() {
  return (
    <AppLayout>
      <Outlet />
    </AppLayout>
  );
}

// ── Router Definition ─────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <AuthScreen />
  },
  // ── Authenticated routes with AppLayout ──────────────────
  {
    element: <AuthenticatedLayout />,
    children: [
      {
        path: '/doctor',
        element: (
          <AuthGuard allowedRoles={['doctor', 'receptionist', 'clinic_admin', 'super_admin']}>
            <DoctorPatientList />
          </AuthGuard>
        )
      },
      {
        path: '/doctor/session/:id',
        element: (
          <AuthGuard allowedRoles={['doctor', 'receptionist', 'clinic_admin', 'super_admin']}>
            <DecisionCard />
          </AuthGuard>
        )
      },
      {
        path: '/receptionist',
        element: (
          <AuthGuard allowedRoles={['receptionist', 'clinic_admin', 'super_admin']}>
            <div className="p-8 text-white text-center">
              <h1 className="text-2xl font-bold mb-4">لوحة الاستقبال</h1>
              <p className="text-white/60">جاري التطوير...</p>
            </div>
          </AuthGuard>
        )
      },
      {
        path: '/clinic_admin',
        element: (
          <AuthGuard allowedRoles={['clinic_admin', 'super_admin']}>
            <div className="p-8 text-white text-center">
              <h1 className="text-2xl font-bold mb-4">لوحة تحكم العيادة</h1>
              <p className="text-white/60">جاري التطوير...</p>
            </div>
          </AuthGuard>
        )
      },
      {
        path: '/super_admin',
        element: (
          <AuthGuard allowedRoles={['super_admin']}>
            <div className="p-8 text-white text-center">
              <h1 className="text-2xl font-bold mb-4">لوحة تحكم النظام</h1>
              <p className="text-white/60">جاري التطوير...</p>
            </div>
          </AuthGuard>
        )
      },
    ]
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);

export default router;