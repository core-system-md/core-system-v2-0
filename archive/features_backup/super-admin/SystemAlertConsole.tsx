interface SystemAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  source: string;
  timestamp: string;
  acknowledged: boolean;
}

interface SystemAlertConsoleProps {
  alerts: SystemAlert[];
  onAcknowledge?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

export function SystemAlertConsole({ alerts, onAcknowledge, onDismiss }: SystemAlertConsoleProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "bg-red-600/20 text-red-300 border-red-600/50";
      case "warning": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">System Alerts</h2>
        <span className="text-xs text-slate-500">{alerts.filter((a) => !a.acknowledged).length} unacknowledged</span>
      </div>
      <div className="divide-y divide-slate-800 max-h-96 overflow-auto">
        {alerts.map((alert) => (
          <div key={alert.id} className={`p-4 ${!alert.acknowledged ? "bg-slate-800/30" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider border ${getSeverityColor(alert.severity)}`}>{alert.severity}</span>
                  <span className="text-xs text-slate-500">{alert.source}</span>
                </div>
                <p className="text-sm text-slate-300">{alert.message}</p>
                <p className="text-xs text-slate-600 mt-1">{new Date(alert.timestamp).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {!alert.acknowledged && onAcknowledge && <button onClick={() => onAcknowledge(alert.id)} className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs hover:bg-emerald-500/20 transition-colors">Ack</button>}
                {onDismiss && <button onClick={() => onDismiss(alert.id)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700 transition-colors">Dismiss</button>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
