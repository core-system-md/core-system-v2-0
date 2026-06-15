import { useState } from "react";
import { Outlet, useLocation, Link, useNavigate } from "react-router-dom";
import { Users, User, Calendar, FileText, Menu, LogOut, Building2 } from "lucide-react";
import { useAuthContext } from "@/core/auth/AuthProvider";
import { useTenantStore } from "@/shared/store/tenantStore";

export function ReceptionLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const { fullName, role, logout } = useAuthContext();
  const { tenantName, primaryColor } = useTenantStore();

  const navItems = [
    { path: "/reception", icon: Users, label: "Queue" },
    { path: "/reception/patients", icon: User, label: "Patients" },
    { path: "/reception/appointments", icon: Calendar, label: "Appointments" },
    { path: "/reception/invoices", icon: FileText, label: "Invoices" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const sidebarBg = primaryColor || "#1B2A4A";
  const headerBg = primaryColor || "#1B2A4A";

  return (
    <div className="min-h-screen bg-[#0F172A] flex text-slate-100">
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 border-r border-white/10 flex flex-col transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0`}
        style={{ backgroundColor: sidebarBg }}
      >
        <div className="h-16 flex items-center px-6 border-b border-white/10">
          <Building2 className="w-6 h-6 text-white/90 mr-3" />
          <div className="flex flex-col">
            <span className="text-lg font-bold text-white leading-tight">CORE</span>
            {tenantName && (
              <span className="text-xs text-white/50 truncate max-w-[140px]">{tenantName}</span>
            )}
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive ? 'bg-white/10 text-white border-l-4 border-white' : 'text-white/60 hover:text-white hover:bg-white/5'
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-white/10 space-y-3">
          {fullName && (
            <div className="px-4 py-2">
              <p className="text-sm font-medium text-white">{fullName}</p>
              <p className="text-xs text-white/50 capitalize">{role}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-white/60 hover:text-red-400 transition-colors w-full rounded-lg hover:bg-white/5"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sign Out</span>
          </button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header
          className="h-16 border-b border-white/10 flex items-center justify-between px-4 md:px-6 backdrop-blur-sm"
          style={{ backgroundColor: `${headerBg}CC` }}
        >
          <button className="md:hidden p-2 text-white/60" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-lg font-semibold text-white">Reception Dashboard</h1>
            <p className="text-xs text-white/50">لوحة الاستقبال</p>
          </div>
          <div className="flex items-center gap-3">
            {fullName && (
              <span className="hidden md:block text-sm text-white/70">{fullName}</span>
            )}
            <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
              <User className="w-5 h-5 text-white/80" />
            </div>
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 overflow-auto bg-[#0F172A]">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
