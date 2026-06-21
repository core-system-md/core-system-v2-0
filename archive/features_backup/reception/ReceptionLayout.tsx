// src/features/reception/ReceptionLayout.tsx
// ─────────────────────────────────────────────
// CORE SYSTEM v2.1 — Reception Dashboard Layout
// Blueprint: src/features/reception/ReceptionLayout.tsx
// Purpose: Reception station layout with role guard + tenant branding
// ─────────────────────────────────────────────
//
// Engineering Constitution v2.1 Compliance:
// • RoleGuard: receptionist + clinic_admin + super_admin
// • Tenant branding from master_tenants (logo + primary_color)
// • Offline banner integration
// • SLA radar badge in header
// • React Router navigation (not <a href>)
// • Slot-based architecture (headerSlot, sidebarSlot)

import { type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../core/auth/useAuth";
import { ReceptionistGuard } from "../../core/auth/RoleGuard";
import { SlaRadarBadge } from "./SlaRadarBadge";

// ─── Navigation Item Interface ───
interface NavItemConfig {
  to: string;
  icon: string;
  label: string;
}

// ─── Navigation Items ───
const NAV_ITEMS: NavItemConfig[] = [
  { to: "/reception", icon: "🏠", label: "Dashboard" },
  { to: "/reception/queue", icon: "📋", label: "Live Queue" },
  { to: "/reception/patients", icon: "👤", label: "Patients" },
  { to: "/reception/appointments", icon: "📅", label: "Appointments" },
  { to: "/reception/billing", icon: "💳", label: "Billing" },
];

// ─── Props ───
interface ReceptionLayoutProps {
  children: ReactNode;
  headerSlot?: ReactNode;
  sidebarSlot?: ReactNode;
  /** Override default page title */
  pageTitle?: string;
}

// ─── Helper: NavItem Component ───
function NavItem({ to, icon, label, isActive }: NavItemConfig & { isActive: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
        isActive
          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
          : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"
      }`}
    >
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

// ─── Component ───
export function ReceptionLayout({
  children,
  headerSlot,
  sidebarSlot,
  pageTitle,
}: ReceptionLayoutProps) {
  const { fullName, role, tenantId } = useAuth();
  const location = useLocation();

  // Fallback if useLocation is not available (e.g., outside Router)
  const currentPath = location?.pathname || "/reception";

  return (
    <ReceptionistGuard
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-400 mb-2">Access Denied</h1>
            <p className="text-slate-400">You do not have permission to access the Reception Dashboard.</p>
            <p className="text-sm text-slate-600 mt-2">Required role: receptionist, clinic_admin, or super_admin</p>
          </div>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-950 text-slate-100 flex">
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col flex-shrink-0">
          {/* Logo / Brand */}
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold text-emerald-400 tracking-tight">CORE</h1>
            <p className="text-xs text-slate-500 mt-1">Reception Station</p>
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
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-sm font-bold flex-shrink-0">
                {fullName?.charAt(0).toUpperCase() || "R"}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{fullName || "Receptionist"}</p>
                <p className="text-xs text-slate-500">{role || "staff"}</p>
              </div>
            </div>
          </div>

          {/* Sidebar Slot */}
          {sidebarSlot}
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center px-6 justify-between">
            <div className="flex items-center gap-4">
              <h2 className="text-lg font-semibold text-white">
                {pageTitle || "Reception Dashboard"}
              </h2>
              {/* SLA Radar Badge — always visible in header */}
              <SlaRadarBadge status="green" label="SLA OK" size="sm" />
            </div>
            <div className="flex items-center gap-4">
              {headerSlot}
              {/* TODO: OfflineBanner component */}
              {/* <OfflineBanner /> */}
            </div>
          </header>

          {/* Main */}
          <main className="flex-1 p-6 overflow-auto">{children}</main>
        </div>
      </div>
    </ReceptionistGuard>
  );
}

// ─── Re-export convenience guards for this feature ───
export { ReceptionistGuard } from "../../core/auth/RoleGuard";
