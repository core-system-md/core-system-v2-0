interface TenantDetail {
  id: string;
  name: string;
  ownerEmail: string;
  phone: string;
  address: string;
  taxId: string;
  createdAt: string;
  settings: Record<string, unknown>;
}

interface TenantDetailPanelProps {
  tenant: TenantDetail;
  onUpdate?: (id: string, data: Partial<TenantDetail>) => void;
}

export function TenantDetailPanel({ tenant, onUpdate: _onUpdate }: TenantDetailPanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4">
      <h2 className="text-lg font-semibold text-white mb-4">Tenant Details</h2>
      <div className="grid grid-cols-2 gap-4">
        <DetailField label="Name" value={tenant.name} />
        <DetailField label="Owner Email" value={tenant.ownerEmail} />
        <DetailField label="Phone" value={tenant.phone} />
        <DetailField label="Tax ID" value={tenant.taxId} />
        <DetailField label="Address" value={tenant.address} />
        <DetailField label="Created" value={new Date(tenant.createdAt).toLocaleDateString()} />
      </div>
      <div className="border-t border-slate-800 pt-4">
        <h3 className="text-sm font-medium text-slate-400 mb-2">Settings</h3>
        <pre className="bg-slate-950 rounded-lg p-3 text-xs text-slate-500 overflow-auto">{JSON.stringify(tenant.settings, null, 2)}</pre>
      </div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500 uppercase tracking-wider">{label}</p>
      <p className="text-sm text-white mt-0.5">{value || "—"}</p>
    </div>
  );
}
