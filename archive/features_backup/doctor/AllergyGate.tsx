import { useState } from "react";

interface Allergy {
  id: string;
  allergen: string;
  severity: "mild" | "moderate" | "severe" | "life_threatening";
  reaction: string;
  date_reported: string;
}

interface AllergyGateProps {
  allergies: Allergy[];
  onAddAllergy?: (allergy: Omit<Allergy, "id">) => void;
  onAcknowledge?: (id: string) => void;
}

export function AllergyGate({ allergies, onAddAllergy, onAcknowledge }: AllergyGateProps) {
  const [isOpen, setIsOpen] = useState(allergies.length > 0);
  const [newAllergen, setNewAllergen] = useState("");
  const [newSeverity, setNewSeverity] = useState<Allergy["severity"]>("mild");
  const [newReaction, setNewReaction] = useState("");

  if (!isOpen && allergies.length === 0) return null;

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "life_threatening": return "bg-red-600/20 text-red-300 border-red-600/50";
      case "severe": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "moderate": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default: return "bg-blue-500/15 text-blue-400 border-blue-500/30";
    }
  };

  const hasCritical = allergies.some((a) => a.severity === "severe" || a.severity === "life_threatening");

  return (
    <div className={`rounded-2xl border p-5 ${hasCritical ? "bg-red-950/20 border-red-600/30" : "bg-slate-900 border-slate-800"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <svg className={`w-5 h-5 ${hasCritical ? "text-red-400" : "text-amber-400"}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3 className={`font-semibold ${hasCritical ? "text-red-300" : "text-white"}`}>
            Allergy Gate {hasCritical && <span className="text-red-400 text-xs ml-2">⚠ CRITICAL</span>}
          </h3>
        </div>
        <button onClick={() => setIsOpen(!isOpen)} className="text-slate-400 hover:text-white">
          {isOpen ? "▼" : "▶"}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="space-y-2 mb-4">
            {allergies.map((allergy) => (
              <div key={allergy.id} className={`flex items-center justify-between p-3 rounded-xl border ${getSeverityColor(allergy.severity)}`}>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{allergy.allergen}</span>
                    <span className="text-[10px] uppercase tracking-wider opacity-70">{allergy.severity.replace("_", " ")}</span>
                  </div>
                  <p className="text-xs opacity-70 mt-0.5">{allergy.reaction}</p>
                </div>
                <button
                  onClick={() => onAcknowledge?.(allergy.id)}
                  className="px-2 py-1 rounded-lg bg-white/10 text-xs hover:bg-white/20 transition-colors"
                >
                  ✓
                </button>
              </div>
            ))}
            {allergies.length === 0 && <p className="text-sm text-slate-500 text-center py-4">No known allergies</p>}
          </div>

          <div className="border-t border-slate-800 pt-3">
            <p className="text-xs text-slate-500 mb-2">Add new allergy</p>
            <div className="flex gap-2">
              <input
                type="text"
                value={newAllergen}
                onChange={(e) => setNewAllergen(e.target.value)}
                placeholder="Allergen"
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
              <select
                value={newSeverity}
                onChange={(e) => setNewSeverity(e.target.value as Allergy["severity"])}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white"
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="life_threatening">Critical</option>
              </select>
            </div>
            <input
              type="text"
              value={newReaction}
              onChange={(e) => setNewReaction(e.target.value)}
              placeholder="Reaction description"
              className="w-full mt-2 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
            <button
              onClick={() => {
                if (!newAllergen.trim()) return;
                onAddAllergy?.({ allergen: newAllergen, severity: newSeverity, reaction: newReaction, date_reported: new Date().toISOString() });
                setNewAllergen(""); setNewReaction(""); setNewSeverity("mild");
              }}
              className="w-full mt-2 py-2 rounded-lg bg-blue-500/10 text-blue-400 text-sm font-medium hover:bg-blue-500/20 transition-colors border border-blue-500/20"
            >
              Add Allergy
            </button>
          </div>
        </>
      )}
    </div>
  );
}
