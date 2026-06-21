interface SwapSuggestion {
  fromDoctorId: string;
  fromDoctorName: string;
  toDoctorId: string;
  toDoctorName: string;
  reason: string;
  estimatedTimeSave: number;
  confidence: number;
}

interface HotSwapSuggestionProps {
  suggestions: SwapSuggestion[];
  onAccept: (suggestion: SwapSuggestion) => void;
  onDismiss: (suggestion: SwapSuggestion) => void;
}

export function HotSwapSuggestion({ suggestions, onAccept, onDismiss }: HotSwapSuggestionProps) {
  if (suggestions.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        <h3 className="text-sm font-semibold text-emerald-400">Hot Swap Suggestions</h3>
      </div>
      {suggestions.map((s) => (
        <div key={`${s.fromDoctorId}-${s.toDoctorId}`} className="bg-slate-900 border border-emerald-500/20 rounded-xl p-4 hover:border-emerald-500/40 transition-colors">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-slate-300">Move patient from <span className="font-medium text-white">{s.fromDoctorName}</span> to <span className="font-medium text-emerald-400">{s.toDoctorName}</span></p>
              <p className="text-xs text-slate-500 mt-1">{s.reason}</p>
              <div className="flex items-center gap-4 mt-2">
                <span className="text-xs text-emerald-400">Save ~{s.estimatedTimeSave} min</span>
                <span className="text-xs text-slate-500">{Math.round(s.confidence * 100)}% confidence</span>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button onClick={() => onAccept(s)} className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors">Apply</button>
              <button onClick={() => onDismiss(s)} className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-400 text-xs hover:bg-slate-700 transition-colors">Skip</button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
