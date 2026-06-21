interface CoreScoreWidgetProps {
  score: number;
  breakdown: {
    label: string;
    value: number;
    weight: number;
  }[];
  trend?: "up" | "down" | "stable";
  previousScore?: number;
}

export function CoreScoreWidget({ score, breakdown, trend = "stable", previousScore }: CoreScoreWidgetProps) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-emerald-400";
    if (s >= 60) return "text-blue-400";
    if (s >= 40) return "text-amber-400";
    return "text-red-400";
  };

  const getScoreBg = (s: number) => {
    if (s >= 80) return "bg-emerald-500/10 border-emerald-500/20";
    if (s >= 60) return "bg-blue-500/10 border-blue-500/20";
    if (s >= 40) return "bg-amber-500/10 border-amber-500/20";
    return "bg-red-500/10 border-red-500/20";
  };

  const getTrendIcon = () => {
    switch (trend) {
      case "up": return "↗";
      case "down": return "↘";
      default: return "→";
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up": return "text-emerald-400";
      case "down": return "text-red-400";
      default: return "text-slate-400";
    }
  };

  return (
    <div className={`rounded-2xl border p-6 ${getScoreBg(score)}`}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Core Score</h3>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-5xl font-bold ${getScoreColor(score)}`}>{score}</span>
            <span className={`text-lg ${getTrendColor()}`}>{getTrendIcon()}</span>
          </div>
          {previousScore !== undefined && (
            <p className="text-xs text-slate-500 mt-1">
              Previous: {previousScore} ({score > previousScore ? "+" : ""}{score - previousScore})
            </p>
          )}
        </div>
        <div className="w-20 h-20 rounded-full border-4 border-slate-700 flex items-center justify-center">
          <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1e293b" strokeWidth="3" />
            <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={score >= 80 ? "#10b981" : score >= 60 ? "#3b82f6" : score >= 40 ? "#f59e0b" : "#ef4444"} strokeWidth="3" strokeDasharray={`${score}, 100`} />
          </svg>
        </div>
      </div>

      <div className="space-y-3">
        {breakdown.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-slate-400">{item.label}</span>
              <span className="text-slate-300">{item.value} × {item.weight}%</span>
            </div>
            <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${score >= 80 ? "bg-emerald-500" : score >= 60 ? "bg-blue-500" : score >= 40 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${(item.value / 100) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
