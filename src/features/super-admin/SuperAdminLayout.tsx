// ============================================================
// CORE SYSTEM v2.1 — SuperAdminLayout
// FIXED: 2026-07-06 — Added proper shell with Outlet
// FIXED: 2026-07-21 — Added Navigation Tabs (P22 Phase 2A)
// Constitution §3: Layout = UI shell + Outlet. NO page content.
// ============================================================

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Building2, Shield } from 'lucide-react';

export default function SuperAdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  const tabs = [
    { id: 'registry', label: 'سجل العيادات', path: '/super-admin', icon: Building2 },
    { id: 'flags', label: 'إدارة الميزات', path: '/super-admin/feature-flags', icon: Shield },
  ];

  const activeTab = tabs.find((t) => location.pathname === t.path)?.id || 'registry';

  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Super Admin UI Shell */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1B2A4A]">لوحة المشرف العام</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">مشرف عام</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-sm font-bold">
              م
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 pt-4">
        <div className="flex gap-2 border-b border-slate-200">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => navigate(tab.path)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#1B2A4A] text-[#1B2A4A]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Page Content via Outlet */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}
