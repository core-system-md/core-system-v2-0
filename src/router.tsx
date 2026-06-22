// ============================================================
// CORE SYSTEM v2.1 — Router Configuration
// Constitution §6 (Roles): super_admin, clinic_admin, doctor, receptionist
// ============================================================

import { createBrowserRouter, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import AuthScreen from '@/components/AuthScreen';

import DoctorPatientList from '@/components/doctor/DoctorPatientList';
import DecisionCard from '@/features/doctor/DecisionCard';

// ── Helper: Read PIN auth from localStorage ─────────────────
function getPinAuth(): { role: string | null; tenant_id: string | null } {
  try {
    const pinData = localStorage.getItem('core_pin_auth');
    if (pinData) {
      const parsed = JSON.parse(pinData);
      // Check expiry
      if (parsed.expiry && Date.now() > parsed.expiry) {
        localStorage.removeItem('core_pin_auth');
        return { role: null, tenant_id: null };
      }
      return {
        role: parsed.role || null,
        tenant_id: parsed.tenant_id || null
      };
    }
  } catch {
    // Invalid JSON
  }
  return { role: null, tenant_id: null };
}

// ── Auth Guard ────────────────────────────────────────────
function AuthGuard({ children, allowedRoles }: { 
  children: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      // 1. Check PIN auth first (core_pin_auth JSON)
      const { role: pinRole, tenant_id } = getPinAuth();
      if (pinRole && tenant_id) {
        setAuthorized(allowedRoles.includes(pinRole));
        return;
      }

      // 2. Fallback to Supabase Auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setAuthorized(false);
        return;
      }

      const { data: userData } = await supabase
        .from('clinic_users')
        .select('role')
        .eq('auth_id', user.id)
        .single();

      setAuthorized(allowedRoles.includes(userData?.role || ''));
    };

    checkAuth();
  }, [allowedRoles]);

  if (authorized === null) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-[#1B2A4A] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authorized) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// ── DecisionCard Wrapper ────────────────────────────────────
function DecisionCardWrapper() {
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    const { role: pinRole, tenant_id } = getPinAuth();
    const isValid = !!tenant_id && (pinRole === 'doctor' || pinRole === 'receptionist' || pinRole === 'clinic_admin' || pinRole === 'super_admin');
    setValid(isValid);
  }, []);

  if (valid === null) return null;
  if (!valid) return <Navigate to="/login" replace />;
  
  return <DecisionCard />;
}

// ── Router Definition ───────────────────────────────────────
export const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />
  },
  {
    path: '/login',
    element: <AuthScreen />
  },
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
        <DecisionCardWrapper />
      </AuthGuard>
    )
  },
  {
    path: '*',
    element: <Navigate to="/login" replace />
  }
]);

export default router;
