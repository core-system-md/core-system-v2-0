interface HealthMetric {
  tenantId: string;
  tenantName: string;
  uptime: number;
  errorRate: number;
  avgResponseTime: number;
  activeUsers: number;
  score: number;
}

interface GlobalHealthScoresProps {
  metrics: HealthMetric[];
}

export function GlobalHealthScores({ metrics }: GlobalHealthScoresProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">Global Health Scores</h2>
      </div>
      <div className="divide-y divide-slate-800">
        {metrics.map((m) => (
          <div key={m.tenantId} className="p-4 flex items-center gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white">{m.tenantName}</p>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                <span>{m.uptime}% uptime</span>
                <span>{m.errorRate}% errors</span>
                <span>{m.avgResponseTime}ms avg</span>
                <span>{m.activeUsers} active</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-slate-700 flex items-center justify-center">
              <span className={`text-sm font-bold ${m.score >= 90 ? "text-emerald-400" : m.score >= 70 ? "text-amber-400" : "text-red-400"}`}>{m.score}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
