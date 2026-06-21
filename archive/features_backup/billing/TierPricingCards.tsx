interface TierPricingCardsProps {
  tiers: {
    name: string;
    price: number;
    period: string;
    features: string[];
    highlighted?: boolean;
  }[];
  onSelect?: (tier: string) => void;
}

export function TierPricingCards({ tiers, onSelect }: TierPricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {tiers.map((tier) => (
        <div key={tier.name} className={`relative bg-slate-900 border rounded-2xl p-8 transition-all ${tier.highlighted ? "border-emerald-500/50 shadow-lg shadow-emerald-500/10" : "border-slate-800 hover:border-slate-700"}`}>
          {tier.highlighted && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-full">RECOMMENDED</span>}
          <h3 className="text-xl font-semibold text-white text-center">{tier.name}</h3>
          <div className="text-center mt-4">
            <span className="text-4xl font-bold text-white">${tier.price}</span>
            <span className="text-slate-500">/{tier.period}</span>
          </div>
          <ul className="mt-6 space-y-3">
            {tier.features.map((feature) => (
              <li key={feature} className="flex items-center gap-3 text-sm text-slate-400">
                <svg className="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                {feature}
              </li>
            ))}
          </ul>
          {onSelect && <button onClick={() => onSelect(tier.name)} className={`w-full mt-8 py-3 rounded-xl font-medium transition-colors ${tier.highlighted ? "bg-emerald-600 text-white hover:bg-emerald-500" : "bg-slate-800 text-slate-300 hover:bg-slate-700"}`}>{tier.highlighted ? "Get Started" : "Select"}</button>}
        </div>
      ))}
    </div>
  );
}
