// ============================================================
// AppLayout.tsx — CORE SYSTEM v2.1
// Blueprint: Layout with sidebar, header, RTL, theme #1B2A4A
// FIXED: 2026-06-25 — No external deps, uses lucide-react only
// ============================================================

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Building2,
  CreditCard,
  BarChart3,
  Shield,
} from "lucide-react";

// ── Role-based navigation items ───────────────────────────
const NAV_ITEMS: Record<string, { label: string; path: string; icon: React.ElementType }[]> = {
  doctor: [
    { label: "قائمة المرضى", path: "/doctor", icon: Users },
    { label: "الجلسات", path: "/doctor/sessions", icon: Stethoscope },
  ],
  receptionist: [
    { label: "الاستقبال", path: "/receptionist", icon: LayoutDashboard },
    { label: "المواعيد", path: "/receptionist/appointments", icon: Calendar },
  ],
  clinic_admin: [
    { label: "لوحة التحكم", path: "/clinic_admin", icon: LayoutDashboard },
    { label: "الموظفين", path: "/clinic_admin/staff", icon: Users },
    { label: "الإحصائيات", path: "/clinic_admin/analytics", icon: BarChart3 },
    { label: "الإعدادات", path: "/clinic_admin/settings", icon: Settings },
  ],
  super_admin: [
    { label: "العيادات", path: "/super_admin", icon: Building2 },
    { label: "الفوترة", path: "/super_admin/billing", icon: CreditCard },
    { label: "الأمان", path: "/super_admin/security", icon: Shield },
  ],
};

// ── Sidebar Component ─────────────────────────────────────
function Sidebar({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { userRole, role, fullName, tenantId, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const currentRole = (userRole || role) as string;
  const items = NAV_ITEMS[currentRole] || [];

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 right-0 h-full w-64 bg-[#1B2A4A] text-white z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "translate-x-full"}
          md:translate-x-0 md:static md:block
          border-l border-white/10 flex flex-col
        `}
        dir="rtl"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">CORE SYSTEM</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 hover:bg-white/10 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-white/10">
          <p className="text-sm text-white/70">مرحباً</p>
          <p className="font-semibold truncate">{fullName || "مستخدم"}</p>
          <p className="text-xs text-white/50 mt-1">
            {currentRole === "doctor" && "طبيب"}
            {currentRole === "receptionist" && "موظف استقبال"}
            {currentRole === "clinic_admin" && "مدير العيادة"}
            {currentRole === "super_admin" && "مدير النظام"}
          </p>
          {tenantId && (
            <p className="text-[10px] text-white/30 mt-1 font-mono truncate">
              {tenantId.slice(0, 8)}...
            </p>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-2 overflow-y-auto">
          <ul className="space-y-1">
            {items.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <li key={item.path}>
                  <button
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                    className={`
                      w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                      transition-colors text-right
                      ${isActive
                        ? "bg-white/15 text-white font-medium"
                        : "text-white/70 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {isActive && <ChevronRight className="w-4 h-4" />}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer — Logout */}
        <div className="p-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                       text-red-300 hover:bg-red-500/20 transition-colors text-right"
          >
            <LogOut className="w-5 h-5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>
    </>
  );
}

// ── Header Component ──────────────────────────────────────
function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { fullName, userRole, role } = useAuth();
  const currentRole = (userRole || role) as string;

  return (
    <header className="h-16 bg-[#1B2A4A] border-b border-white/10 flex items-center px-4 gap-4">
      <button
        onClick={onMenuClick}
        className="md:hidden p-2 hover:bg-white/10 rounded-lg text-white"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      <div className="flex items-center gap-3 text-white">
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{fullName || "مستخدم"}</p>
          <p className="text-xs text-white/50">
            {currentRole === "doctor" && "طبيب"}
            {currentRole === "receptionist" && "موظف استقبال"}
            {currentRole === "clinic_admin" && "مدير العيادة"}
            {currentRole === "super_admin" && "مدير النظام"}
          </p>
        </div>
        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center">
          <span className="text-sm font-bold">
            {(fullName || "?")[0].toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

// ── Main Layout ───────────────────────────────────────────
export function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0f172a] text-white" dir="rtl">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header onMenuClick={() => setSidebarOpen(true)} />
          <main className="flex-1 p-4 md:p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

export default AppLayout;