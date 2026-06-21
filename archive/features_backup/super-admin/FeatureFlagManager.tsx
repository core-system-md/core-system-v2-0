interface FeatureFlag {
  name: string;
  enabled: boolean;
  description: string;
  rolloutPercentage: number;
}

interface FeatureFlagManagerProps {
  flags: FeatureFlag[];
  onToggle?: (name: string) => void;
  onRolloutChange?: (name: string, percentage: number) => void;
}

export function FeatureFlagManager({ flags, onToggle, onRolloutChange }: FeatureFlagManagerProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">Feature Flags</h2>
      </div>
      <div className="divide-y divide-slate-800">
        {flags.map((flag) => (
          <div key={flag.name} className="p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-white text-sm">{flag.name}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${flag.enabled ? "bg-emerald-500/10 text-emerald-400" : "bg-slate-500/10 text-slate-500"}`}>{flag.enabled ? "ON" : "OFF"}</span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">{flag.description}</p>
            </div>
            <div className="flex items-center gap-4">
              {flag.enabled && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">Rollout</span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={flag.rolloutPercentage}
                    onChange={(e) => onRolloutChange?.(flag.name, parseInt(e.target.value))}
                    className="w-24 accent-rose-500"
                  />
                  <span className="text-xs text-slate-400 w-8">{flag.rolloutPercentage}%</span>
                </div>
              )}
              <button
                onClick={() => onToggle?.(flag.name)}
                className={`relative w-12 h-6 rounded-full transition-colors ${flag.enabled ? "bg-emerald-500" : "bg-slate-700"}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${flag.enabled ? "translate-x-6" : "translate-x-0.5"}`} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
