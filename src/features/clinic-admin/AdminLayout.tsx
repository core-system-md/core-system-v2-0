// ============================================================
// CORE SYSTEM v2.1 — AdminLayout
// FIXED: 2026-07-06 — Kept UI shell + navigation, extracted page content
// FIXED: 2026-09-08 — Added Blueprint-backed patient directory and schedule views
// Constitution §3: Layout = UI shell + Outlet. NO page content.
// ============================================================

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useAuthStore, selectUserRole } from '@/shared/store/authStore';
import { useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Users, History, AlertTriangle, CreditCard, CalendarDays } from 'lucide-react';

type TabId = 'overview' | 'revenue' | 'staff' | 'schedule' | 'patients' | 'audit' | 'breaches' | 'billing';

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard; path: string }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, path: '/admin' },
  { id: 'revenue', label: 'الإيرادات', icon: TrendingUp, path: '/admin/revenue' },
  { id: 'staff', label: 'الطاقم', icon: Users, path: '/admin/staff' },
  { id: 'schedule', label: 'الجدول', icon: CalendarDays, path: '/admin/schedule' },
  { id: 'patients', label: 'المرضى', icon: Users, path: '/admin/patients' },
  { id: 'audit', label: 'التدقيق', icon: History, path: '/admin/audit' },
  { id: 'breaches', label: 'التجاوزات', icon: AlertTriangle, path: '/admin/breaches' },
  { id: 'billing', label: 'الاشتراك', icon: CreditCard, path: '/admin/billing' },
];

const ROLE_LABELS_AR = {
  clinic_admin: 'مدير العيادة',
  super_admin: 'مشرف عام',
} as const;

export default function AdminLayout() {
  const { isAuthenticated, user } = useAuth();
  const role = useAuthStore(selectUserRole);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    if (role !== 'clinic_admin' && role !== 'super_admin') {
      navigate('/doctor');
      return;
    }
  }, [isAuthenticated, role, navigate]);

  if (!isAuthenticated || (role !== 'clinic_admin' && role !== 'super_admin')) {
    return null;
  }

  const activeTab = tabs.find((t) => location.pathname === t.path)?.id || 'overview';
  const roleLabel = role ? ROLE_LABELS_AR[role] : 'مدير العيادة';
  const displayName = user?.full_name_ar || user?.full_name || roleLabel;

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">لوحة تحكم العيادة</h1>
          <p className="text-gray-500">مرحباً {displayName}</p>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="flex min-w-max gap-1 bg-gray-100 rounded-lg p-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={`flex items-center justify-center gap-2 py-2 px-4 rounded-md text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-primary shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <Outlet />
        </div>
      </div>
    </div>
  );
}