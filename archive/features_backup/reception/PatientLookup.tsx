import { useState, useCallback, useRef } from "react";
import { supabase } from "../../infrastructure/supabase/client";

interface PatientResult {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null;
  core_score: number | null;
}

interface PatientLookupProps {
  tenantId: string;
  onSelect: (patient: PatientResult) => void;
  placeholder?: string;
}

export function PatientLookup({ tenantId, onSelect, placeholder = "Search patients..." }: PatientLookupProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const search = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) { setResults([]); return; }
    setIsSearching(true);
    const { data } = await supabase
      .from("clinic_patients")
      .select("id, full_name, phone, email, date_of_birth, core_score")
      .eq("tenant_id", tenantId)
      .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%`)
      .limit(8);
    setResults(data || []);
    setIsSearching(false);
  }, [tenantId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setShowResults(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  };

  const handleSelect = (patient: PatientResult) => {
    onSelect(patient);
    setQuery(patient.full_name);
    setShowResults(false);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input type="text" value={query} onChange={handleChange} onFocus={() => query.length >= 2 && setShowResults(true)} placeholder={placeholder} className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 transition-all" />
        {isSearching && <div className="absolute right-3 top-1/2 -translate-y-1/2"><div className="w-4 h-4 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin" /></div>}
      </div>
      {showResults && (results.length > 0 || query.length >= 2) && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
          {results.length === 0 ? <div className="p-4 text-sm text-slate-500 text-center">No patients found</div> : (
            results.map((patient) => (
              <button key={patient.id} onClick={() => handleSelect(patient)} className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-800 transition-colors text-left">
                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-slate-400">{patient.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{patient.full_name}</p>
                  <p className="text-xs text-slate-500">{patient.phone || patient.email || "No contact info"}</p>
                </div>
                {patient.core_score !== null && <span className={`text-xs font-bold ${patient.core_score >= 70 ? "text-emerald-400" : "text-amber-400"}`}>{patient.core_score}</span>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
