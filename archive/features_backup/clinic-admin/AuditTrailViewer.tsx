interface AuditEvent {
  id: string;
  action: string;
  tableName: string;
  recordId: string;
  oldData: Record<string, unknown> | null;
  newData: Record<string, unknown> | null;
  performedBy: string;
  performedAt: string;
}

interface AuditTrailViewerProps {
  events: AuditEvent[];
}

export function AuditTrailViewer({ events }: AuditTrailViewerProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">Audit Trail</h2>
      </div>
      <div className="divide-y divide-slate-800 max-h-96 overflow-auto">
        {events.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No audit events</div>}
        {events.map((event) => (
          <div key={event.id} className="p-4">
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${event.action === "INSERT" ? "bg-emerald-500/10 text-emerald-400" : event.action === "UPDATE" ? "bg-amber-500/10 text-amber-400" : "bg-red-500/10 text-red-400"}`}>{event.action}</span>
              <span className="text-xs text-slate-500">{event.tableName} • {event.recordId}</span>
            </div>
            <p className="text-xs text-slate-400">by {event.performedBy} at {new Date(event.performedAt).toLocaleString()}</p>
            {event.oldData && <p className="text-xs text-slate-600 mt-1 line-clamp-2">Old: {JSON.stringify(event.oldData)}</p>}
            {event.newData && <p className="text-xs text-slate-600 line-clamp-2">New: {JSON.stringify(event.newData)}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
