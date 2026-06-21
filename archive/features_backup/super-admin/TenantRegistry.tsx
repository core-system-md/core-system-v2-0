interface Tenant {
  id: string;
  name: string;
  slug: string;
  tier: "free" | "starter" | "professional" | "enterprise";
  status: "active" | "suspended" | "trial" | "cancelled";
  createdAt: string;
  lastActiveAt: string;
  userCount: number;
  monthlyRevenue: number;
}

interface TenantRegistryProps {
  tenants: Tenant[];
  onSelect?: (tenant: Tenant) => void;
  onSuspend?: (id: string) => void;
  onActivate?: (id: string) => void;
}

export function TenantRegistry({ tenants, onSelect, onSuspend, onActivate }: TenantRegistryProps) {
  const getTierColor = (tier: string) => {
    switch (tier) {
      case "enterprise": return "bg-rose-500/10 text-rose-400 border-rose-500/20";
      case "professional": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "starter": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      default: return "bg-slate-500/10 text-slate-400 border-slate-500/20";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active": return "text-emerald-400";
      case "trial": return "text-amber-400";
      case "suspended": return "text-red-400";
      default: return "text-slate-500";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Tenant Registry</h2>
        <span className="text-xs text-slate-500">{tenants.length} tenants</span>
      </div>
      <div className="divide-y divide-slate-800">
        {tenants.map((tenant) => (
          <div key={tenant.id} className="p-4 flex items-center gap-4 hover:bg-slate-800/50 transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white truncate">{tenant.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${getTierColor(tenant.tier)}`}>{tenant.tier}</span>
                <span className={`text-xs ${getStatusColor(tenant.status)}`}>{tenant.status}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{tenant.slug} • {tenant.userCount} users • ${tenant.monthlyRevenue}/mo</p>
            </div>
            <div className="flex items-center gap-2">
              {onSelect && <button onClick={() => onSelect(tenant)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs hover:bg-slate-700 transition-colors">Details</button>}
              {tenant.status === "active" && onSuspend && <button onClick={() => onSuspend(tenant.id)} className="px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs hover:bg-red-500/20 transition-colors">Suspend</button>}
              {tenant.status === "suspended" && onActivate && <button onClick={() => onActivate(tenant.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">Activate</button>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
