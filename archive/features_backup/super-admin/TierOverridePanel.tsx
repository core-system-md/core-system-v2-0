interface TierOverridePanelProps {
  tenantId: string;
  currentTier: string;
  allowedTiers: string[];
  onChangeTier?: (tenantId: string, tier: string) => void;
  onOverrideFeature?: (tenantId: string, feature: string, enabled: boolean) => void;
}

export function TierOverridePanel({ tenantId, currentTier, allowedTiers, onChangeTier }: TierOverridePanelProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-white mb-4">Tier Override</h2>
      <div className="space-y-3">
        <p className="text-sm text-slate-400">Current: <span className="text-white font-medium">{currentTier}</span></p>
        <div className="flex gap-2 flex-wrap">
          {allowedTiers.map((tier) => (
            <button
              key={tier}
              onClick={() => onChangeTier?.(tenantId, tier)}
              disabled={tier === currentTier}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${tier === currentTier ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"}`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
