import { useState } from "react";
import { Outlet, useLocation, Link } from "react-router-dom";
import { Building, CreditCard, Activity, ScrollText, Menu, LogOut, User } from "lucide-react";

export function SuperAdminLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: "/super-admin", icon: Building, label: "Tenants" },
    { path: "/super-admin/billing", icon: CreditCard, label: "Billing" },
    { path: "/super-admin/health", icon: Activity, label: "System Health" },
    { path: "/super-admin/audit", icon: ScrollText, label: "Audit Logs" },
  ];

  return (
    <div className="min-h-screen bg-[#0F172A] flex">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-[#1B2A4A] border-r border-white/10 flex flex-col transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}>
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <span className="text-xl font-bold text-white">CORE</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? "bg-white/10 text-white border-l-4 border-white" : "text-white/60 hover:text-white hover:bg-white/5"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10">
          <button className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-red-400 transition-colors w-full rounded-lg hover:bg-white/5">
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-[#1B2A4A]/80 border-b border-white/10 flex items-center justify-between px-4 md:px-6">
          <button className="md:hidden p-2 text-white/60" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-lg font-semibold text-white">Super Admin Dashboard</h1>
            <p className="text-xs text-white/50">لوحة المدير العام</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-3 text-sm text-white/60">
              <span className="flex items-center gap-1"><Building className="w-4 h-4" /> 12 Tenants</span>
              <span className="flex items-center gap-1"><Activity className="w-4 h-4" /> 98.5% Uptime</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white/80" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}