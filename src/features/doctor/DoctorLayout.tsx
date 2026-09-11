// ============================================================
// CORE SYSTEM v2.1 — DoctorLayout
// Blueprint-aligned doctor shell: RTL, light UI, role-aware identity
// ============================================================

import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { IdleWatcher } from '@/shared/components/IdleWatcher';
import { useAuthStore } from '@/shared/store/authStore';
import { useEffect } from 'react';
import { Activity, LayoutDashboard, Users } from 'lucide-react';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';

const ROLE_LABELS_AR = {
  doctor: 'طبيب',
  clinic_admin: 'مدير العيادة',
  super_admin: 'مشرف عام',
  receptionist: 'موظف الاستقبال',
} as const;

const navClass = (active: boolean) =>
  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${active ? 'bg-[#1B2A4A] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`;

export default function DoctorLayout() {
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const navigate = useNavigate();
  const location = useLocation();
  const role = user?.role;
  const roleLabel = role ? ROLE_LABELS_AR[role] : 'طبيب';
  const displayName = user?.full_name_ar || user?.full_name || roleLabel;
  const initial = displayName.trim().charAt(0) || 'ط';

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { replace: true });
      return;
    }
    if (role !== 'doctor' && role !== 'clinic_admin' && role !== 'super_admin') navigate('/reception', { replace: true });
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'doctor' && role !== 'clinic_admin' && role !== 'super_admin')) return null;

  const go = (path: string) => {
    if (location.pathname !== path) navigate(path);
  };

  return (
    <IdleWatcher timeout={300000} onIdle={() => useAuthStore.getState().lock()}>
      <div className="min-h-screen bg-slate-50" dir="rtl">
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B2A4A] text-sm font-bold text-white shadow-sm">{initial}</div>
                <div><p className="text-xs font-medium text-slate-400">CORE SYSTEM</p><h1 className="text-base font-bold text-[#1B2A4A]">محطة الطبيب</h1></div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 lg:hidden"><span className="text-xs font-medium text-slate-600">{roleLabel}</span><span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="متصل" /></div>
            </div>

            <nav className="flex flex-wrap gap-2 overflow-x-auto pb-1" aria-label="واجهة الطبيب">
              <PermissionGuard required="view_sessions">
                <button type="button" onClick={() => go('/doctor')} className={navClass(location.pathname === '/doctor')} aria-current={location.pathname === '/doctor' ? 'page' : undefined}><LayoutDashboard className="h-4 w-4" />قائمة الجلسات</button>
              </PermissionGuard>
              <PermissionGuard required="view_patients">
                <button type="button" onClick={() => go('/doctor/patients')} className={navClass(location.pathname === '/doctor/patients')} aria-current={location.pathname === '/doctor/patients' ? 'page' : undefined}><Users className="h-4 w-4" />المرضى</button>
              </PermissionGuard>
            </nav>

            <div className="hidden items-center gap-3 rounded-xl bg-slate-50 px-3 py-2 lg:flex"><div className="text-right"><p className="text-sm font-semibold text-slate-700">{displayName}</p><p className="text-xs text-slate-500">{roleLabel}</p></div><div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#1B2A4A] text-sm font-bold text-white">{initial}</div><span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="متصل" /><Activity className="h-4 w-4 text-emerald-600" aria-hidden="true" /></div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl"><Outlet /></main>
      </div>
    </IdleWatcher>
  );
}
