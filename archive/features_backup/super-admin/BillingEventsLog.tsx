interface BillingEvent {
  id: string;
  tenantId: string;
  tenantName: string;
  type: "subscription" | "invoice" | "refund" | "failed";
  amount: number;
  status: "succeeded" | "pending" | "failed";
  createdAt: string;
}

interface BillingEventsLogProps {
  events: BillingEvent[];
}

export function BillingEventsLog({ events }: BillingEventsLogProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">Billing Events</h2>
      </div>
      <div className="divide-y divide-slate-800 max-h-96 overflow-auto">
        {events.map((event) => (
          <div key={event.id} className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">{event.tenantName}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${event.type === "subscription" ? "bg-blue-500/10 text-blue-400" : event.type === "refund" ? "bg-amber-500/10 text-amber-400" : event.type === "failed" ? "bg-red-500/10 text-red-400" : "bg-emerald-500/10 text-emerald-400"}`}>{event.type}</span>
              </div>
              <p className="text-xs text-slate-500">{new Date(event.createdAt).toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className={`text-sm font-medium ${event.amount < 0 ? "text-red-400" : "text-white"}`}>{event.amount < 0 ? "-" : "+"}${Math.abs(event.amount).toLocaleString()}</p>
              <span className={`text-xs ${event.status === "succeeded" ? "text-emerald-400" : event.status === "failed" ? "text-red-400" : "text-amber-400"}`}>{event.status}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
