// ============================================================
// CORE SYSTEM v2.1 — ReceptionLayout
// P36: Wrapped with IdleWatcher (10min timeout) — 2026-07-31
// ============================================================

import { Outlet, useNavigate } from 'react-router-dom';
import { IdleWatcher } from '@/shared/components/IdleWatcher';
import { useAuthStore } from '@/shared/store/authStore';
import { useEffect } from 'react';

export default function ReceptionLayout() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const role = user?.role ?? 'receptionist';
  const roleLabel = role === 'super_admin' ? 'مشرف عام' : role === 'clinic_admin' ? 'مدير العيادة' : 'موظف الاستقبال';
  const displayName = user?.full_name_ar || user?.full_name || roleLabel;
  const initial = displayName.trim().charAt(0) || 'م';

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
    else if (role !== 'receptionist' && role !== 'clinic_admin' && role !== 'super_admin') navigate('/doctor');
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'receptionist' && role !== 'clinic_admin' && role !== 'super_admin')) return null;

  return (
    <IdleWatcher timeout={600000} onIdle={() => useAuthStore.getState().lock()}>
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <header className="border-b border-slate-200 bg-white shadow-sm">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 md:px-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B2A4A] text-sm font-bold text-white shadow-sm">
                {initial}
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400">CORE SYSTEM</p>
                <h1 className="text-base font-bold text-[#1B2A4A]">استقبال العيادة</h1>
              </div>
            </div>
            <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2">
              <span className="text-sm font-medium text-slate-600">{roleLabel}</span>
              <span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="متصل" />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl"><Outlet /></main>
      </div>
    </IdleWatcher>
  );
}
