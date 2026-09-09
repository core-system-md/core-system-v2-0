// ============================================================
// CORE SYSTEM v2.1 — DoctorLayout
// P36: Wrapped with IdleWatcher (5min timeout) — 2026-07-31
// ============================================================

import { Outlet, useNavigate } from 'react-router-dom';
import { IdleWatcher } from '@/shared/components/IdleWatcher';
import { useAuthStore } from '@/shared/store/authStore';
import { useEffect } from 'react';

const ROLE_LABELS_AR = { doctor: 'طبيب', clinic_admin: 'مدير العيادة', super_admin: 'مشرف عام', receptionist: 'موظف الاستقبال' } as const;
export default function DoctorLayout() {
  const role = useAuthStore((state) => state.user?.role) ?? 'doctor';
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  useEffect(() => { if (!isAuthenticated) navigate('/login'); else if (role !== 'doctor' && role !== 'clinic_admin' && role !== 'super_admin') navigate('/reception'); }, [isAuthenticated, role, navigate]);
  if (!isAuthenticated || (role !== 'doctor' && role !== 'clinic_admin' && role !== 'super_admin')) return null;
  return <IdleWatcher timeout={300000} onIdle={() => useAuthStore.getState().lock()}><div className="min-h-screen bg-background" dir="rtl"><header className="bg-white border-b border-slate-200 px-6 py-4"><div className="max-w-7xl mx-auto flex items-center justify-between"><h1 className="text-xl font-bold text-primary">لوحة الطبيب</h1><div className="flex items-center gap-3"><span className="text-sm text-slate-500">{ROLE_LABELS_AR[role]}</span><div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white text-sm font-bold">د</div></div></div></header><main className="max-w-7xl mx-auto p-4 md:p-6"><Outlet /></main></div></IdleWatcher>;
}
