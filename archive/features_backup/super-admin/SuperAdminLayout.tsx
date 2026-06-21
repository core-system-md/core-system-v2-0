import { ReactNode } from "react";

interface SuperAdminLayoutProps {
  children: ReactNode;
  headerSlot?: ReactNode;
}

export function SuperAdminLayout({ children, headerSlot }: SuperAdminLayoutProps) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold text-rose-400 tracking-tight">CORE</h1>
          <p className="text-xs text-slate-500 mt-1">Super Admin</p>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <NavItem href="/super-admin" icon="🏠" label="Dashboard" active />
          <NavItem href="/super-admin/tenants" icon="🏢" label="Tenants" />
          <NavItem href="/super-admin/billing" icon="💳" label="Billing" />
          <NavItem href="/super-admin/health" icon="📊" label="Health Scores" />
          <NavItem href="/super-admin/alerts" icon="🔔" label="Alerts" />
        </nav>
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
    <a href={href} className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${active ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" : "text-slate-400 hover:text-slate-100 hover:bg-slate-800"}`}>
      <span className="text-lg">{icon}</span>
      <span>{label}</span>
    </a>
  );
}
