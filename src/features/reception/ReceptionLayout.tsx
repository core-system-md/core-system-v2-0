// ============================================================
// CORE SYSTEM v2.1 — ReceptionLayout
// P36: Wrapped with IdleWatcher (10min timeout) — 2026-07-31
// ============================================================

import { Outlet } from 'react-router-dom';
import { IdleWatcher } from '@/shared/components/IdleWatcher';
import { useAuthStore } from '@/shared/store/authStore';

export default function ReceptionLayout() {
  const user = useAuthStore((state) => state.user);
  const roleLabel = user?.role === 'super_admin'
    ? 'مشرف عام'
    : user?.role === 'clinic_admin'
      ? 'مدير العيادة'
      : 'موظف الاستقبال';
  const displayName = user?.full_name_ar || user?.full_name || roleLabel;
  const initial = displayName.trim().charAt(0) || 'م';

  return (
    <IdleWatcher
      timeout={600000}
      onIdle={() => useAuthStore.getState().lock()}
    >
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <header className="bg-white border-b border-slate-200 px-6 py-4">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <h1 className="text-xl font-bold text-primary">استقبال العيادة</h1>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-500">{roleLabel}</span>
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm font-bold">
                {initial}
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </IdleWatcher>
  );
}
