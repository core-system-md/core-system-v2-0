// ============================================================
// CORE SYSTEM v2.1 — ReceptionLayout
// FIXED: 2026-07-06 — Added proper shell with Outlet
// Constitution §3: Layout = UI shell + Outlet. NO page content.
// ============================================================

import { Outlet } from 'react-router-dom';

export default function ReceptionLayout() {
  return (
    <div className="min-h-screen bg-slate-50" dir="rtl">
      {/* Reception UI Shell */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#1B2A4A]">استقبال العيادة</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">موظف الاستقبال</span>
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center text-white text-sm font-bold">
              س
            </div>
          </div>
        </div>
      </header>

      {/* Page Content via Outlet */}
      <main className="max-w-7xl mx-auto p-4 md:p-6">
        <Outlet />
      </main>
    </div>
  );
}