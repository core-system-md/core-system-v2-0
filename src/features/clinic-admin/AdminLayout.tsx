// ============================================================
// CORE SYSTEM v2.1 — AdminLayout
// FIXED: 2026-07-06 — Kept UI shell + navigation, extracted page content
// Constitution §3: Layout = UI shell + Outlet. NO page content.
// ============================================================

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useAuthStore, selectUserRole } from '@/shared/store/authStore';
import { useEffect } from 'react';
import { LayoutDashboard, TrendingUp, Users, History, AlertTriangle, CreditCard } from 'lucide-react';

type TabId = 'overview' | 'revenue' | 'staff' | 'audit' | 'breaches' | 'billing';

const tabs: { id: TabId; label: string; icon: typeof LayoutDashboard; path: string }[] = [
  { id: 'overview', label: 'نظرة عامة', icon: LayoutDashboard, path: '/admin' },
  { id: 'revenue', label: 'الإيرادات', icon: TrendingUp, path: '/admin/revenue' },
  { id: 'staff', label: 'الطاقم', icon: Users, path: '/admin/staff' },
  { id: 'audit', label: 'التدقيق', icon: History, path: '/admin/audit' },
  { id: 'breaches', label: 'التجاوزات', icon: AlertTriangle, path: '/admin/breaches' },
  { id: 'billing', label: 'الاشتراك', icon: CreditCard, path: '/admin/billing' },
];

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

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-primary">لوحة تحكم العيادة</h1>
          <p className="text-gray-500">مرحباً {user?.full_name || "مدير العيادة"}</p>
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