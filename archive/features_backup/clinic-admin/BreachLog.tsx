interface BreachEvent {
  id: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  occurredAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

interface BreachLogProps {
  breaches: BreachEvent[];
  onResolve?: (id: string) => void;
}

export function BreachLog({ breaches, onResolve }: BreachLogProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-600/20 text-red-300 border-red-600/50";
      case "high": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "medium": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Breach Log</h2>
        <span className="text-xs text-slate-500">{breaches.filter((b) => !b.resolvedAt).length} unresolved</span>
      </div>
      <div className="divide-y divide-slate-800 max-h-96 overflow-auto">
        {breaches.length === 0 && <div className="p-8 text-center text-slate-500 text-sm">No breaches recorded</div>}
        {breaches.map((breach) => (
          <div key={breach.id} className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${getSeverityColor(breach.severity)}`}>{breach.severity}</span>
                  <span className="text-xs text-slate-500">{new Date(breach.occurredAt).toLocaleString()}</span>
                </div>
                <p className="text-sm text-slate-300">{breach.description}</p>
                {breach.resolvedAt && <p className="text-xs text-emerald-400 mt-1">Resolved by {breach.resolvedBy} at {new Date(breach.resolvedAt).toLocaleString()}</p>}
              </div>
              {!breach.resolvedAt && onResolve && (
                <button onClick={() => onResolve(breach.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors border border-emerald-500/20">Resolve</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
