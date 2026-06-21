// src/features/doctor/DoctorLayout.tsx
// ─────────────────────────────────────────────
// CORE SYSTEM v2.1 — Doctor Dashboard Layout
// Blueprint: src/features/doctor/DoctorLayout.tsx
// Purpose: Doctor station layout with role guard + tenant branding
// ─────────────────────────────────────────────
//
// Engineering Constitution v2.1 Compliance:
// • RoleGuard: doctor only
// • Tenant branding from master_tenants (logo + primary_color)
// • React Router navigation (not <a href>)
// • Slot-based architecture (headerSlot, sidebarSlot)

import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../core/auth/useAuth";
import { DoctorGuard } from "../../core/auth/RoleGuard";

// ─── Navigation Items ───
interface NavItemConfig {
  to: string;
  icon: string;
  label: string;
}

const NAV_ITEMS: NavItemConfig[] = [
  { to: "/doctor", icon: "🏠", label: "Dashboard" },
  { to: "/doctor/queue", icon: "📋", label: "My Queue" },
  { to: "/doctor/patients", icon: "👤", label: "Patients" },
  { to: "/doctor/notes", icon: "📝", label: "Clinical Notes" },
  { to: "/doctor/scores", icon: "📊", label: "Core Scores" },
];

// ─── Props ───
interface DoctorLayoutProps {
  children: ReactNode;
  headerSlot?: ReactNode;
  sidebarSlot?: ReactNode;
  pageTitle?: string;
}

// ─── Helper: NavItem Component ───
function NavItem({ to, icon, label, isActive }: NavItemConfig & { isActive: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

// ─── Component ───
export function DoctorLayout({
  children,
  headerSlot,
  sidebarSlot,
  pageTitle,
}: DoctorLayoutProps) {
  const { fullName, role, tenantId } = useAuth();
  const location = useLocation();
  const currentPath = location?.pathname || "/doctor";

  return (
    <DoctorGuard
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
            <p className="text-slate-400">You do not have permission to access the Doctor Dashboard.</p>
            <p className="text-sm text-slate-600 mt-2">Required role: doctor</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
          {/* Logo / Brand */}
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-blue-400 tracking-tight">CORE</h1>
            <p className="text-xs text-slate-500 mt-1">Doctor Station</p>
            {tenantId && (
              <p className="text-[10px] text-slate-600 mt-0.5 font-mono truncate">
                {tenantId.slice(0, 8)}...
              </p>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1">
            {NAV_ITEMS.map((item) => (
              <NavItem
                key={item.to}
                {...item}
                isActive={currentPath === item.to || currentPath.startsWith(item.to + "/")}
              />
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {fullName?.charAt(0).toUpperCase() || "D"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fullName || "Doctor"}</p>
                <p className="text-xs text-slate-500">{role || "doctor"}</p>
              </div>
            </div>
          </div>

          {sidebarSlot}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center px-6 justify-between">
            <h2 className="text-lg font-semibold text-white">
              {pageTitle || "Doctor Dashboard"}
            </h2>
            <div className="flex items-center gap-4">
              {headerSlot}
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </DoctorGuard>
  );
}

export { DoctorGuard } from "../../core/auth/RoleGuard";
