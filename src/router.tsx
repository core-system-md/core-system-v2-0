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

function AuthGuard({ children, allowedRoles }: { 
  children: React.ReactNode; 
  allowedRoles: string[] 
}) {
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    const checkAuth = async () => {
      const pinRole = localStorage.getItem('pin_role');
      const tenant_id = localStorage.getItem('tenant_id');

      if (pinRole && tenant_id) {
        setAuthorized(allowedRoles.includes(pinRole));
        return;
      }

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

function DecisionCardWrapper() {
  const [valid, setValid] = useState<boolean | null>(null);

  useEffect(() => {
    const tenant_id = localStorage.getItem('tenant_id');
    const pin_role = localStorage.getItem('pin_role');
    const isValid = !!tenant_id && (pin_role === 'doctor' || pin_role === 'receptionist');
    setValid(isValid);
  }, []);

  if (valid === null) return null;
  if (!valid) return <Navigate to="/login" replace />;
  
  return <DecisionCard />;
}

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
