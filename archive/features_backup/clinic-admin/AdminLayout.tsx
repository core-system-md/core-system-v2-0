import { ReactNode } from "react";
import { useAuth } from "../../core/auth/useAuth";

interface AdminLayoutProps {
  children: ReactNode;
  headerSlot?: ReactNode;
}

export function AdminLayout({ children, headerSlot }: AdminLayoutProps) {
  const { fullName, role } = useAuth();
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-purple-400 tracking-tight">CORE</h1>
          <p className="text-xs text-slate-500 mt-1">Clinic Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/admin" icon="🏠" label="Dashboard" active />
          <NavItem href="/admin/revenue" icon="💰" label="Revenue" />
          <NavItem href="/admin/staff" icon="👥" label="Staff" />
          <NavItem href="/admin/breaches" icon="⚠️" label="Breach Log" />
          <NavItem href="/admin/audit" icon="🔍" label="Audit Trail" />
          <NavItem href="/admin/schedule" icon="📅" label="Schedule" />
          <NavItem href="/admin/patients" icon="👤" label="Directory" />
          <NavItem href="/admin/inventory" icon="📦" label="Inventory" />
        </nav>
        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center text-sm font-bold">{fullName?.charAt(0) || "A"}</div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{fullName || "Admin"}</p>
              <p className="text-xs text-slate-500">{role || "admin"}</p>
            </div>
          </div>
        </div>
      </aside>
      <div className="flex-1 flex flex-col">
        {headerSlot && <header className="h-16 bg-slate-900/50 border-b border-slate-800 flex items-center px-6">{headerSlot}</header>}
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

function NavItem({ href, icon, label, active }: { href: string; icon: string; label: string; active?: boolean }) {
  return (
    <a href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-purple-500/10 text-purple-400 border border-purple-500/20" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
