// ============================================================
// CORE SYSTEM v2.1 — ReceptionLayout
// P36: Wrapped with IdleWatcher (10min timeout) — 2026-07-31
// ============================================================

import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { IdleWatcher } from '@/shared/components/IdleWatcher';
import { useAuthStore } from '@/shared/store/authStore';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import { CalendarDays, FileText, LayoutDashboard, MessageSquareText } from 'lucide-react';
import { useEffect } from 'react';

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors ${isActive ? 'bg-[#1B2A4A] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`;

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
        <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1B2A4A] text-sm font-bold text-white shadow-sm">{initial}</div>
                <div>
                  <p className="text-xs font-medium text-slate-400">CORE SYSTEM</p>
                  <h1 className="text-base font-bold text-[#1B2A4A]">استقبال العيادة</h1>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 lg:hidden">
                <span className="text-xs font-medium text-slate-600">{roleLabel}</span>
                <span className="h-2 w-2 rounded-full bg-emerald-500" aria-label="متصل" />
              </div>
            </div>

            <nav className="flex flex-wrap gap-2 overflow-x-auto pb-1" aria-label="واجهة الاستقبال">
              <NavLink to="/reception" end className={navClass}><LayoutDashboard className="h-4 w-4" /> الرئيسية</NavLink>
              <PermissionGuard required="view_queue"><NavLink to="/reception" end className={navClass}><CalendarDays className="h-4 w-4" /> الانتظار</NavLink></PermissionGuard>
              <PermissionGuard required="view_inquiries"><NavLink to="/reception/inquiries" className={navClass}><MessageSquareText className="h-4 w-4" /> الاستفسارات</NavLink></PermissionGuard>
              <PermissionGuard required="view_invoices"><NavLink to="/reception/invoices" className={navClass}><FileText className="h-4 w-4" /> الفواتير</NavLink></PermissionGuard>
            </nav>

            <div className="hidden items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 lg:flex">
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
