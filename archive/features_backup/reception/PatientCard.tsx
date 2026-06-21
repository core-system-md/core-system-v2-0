import { useState } from "react";

interface PatientCardProps {
  patient: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    date_of_birth: string | null;
    gender: string | null;
    avatar_url: string | null;
    core_score: number | null;
    last_visit: string | null;
  };
  onEdit?: (id: string) => void;
  onBook?: (id: string) => void;
  onViewHistory?: (id: string) => void;
}

export function PatientCard({ patient, onEdit, onBook, onViewHistory }: PatientCardProps) {
  const [expanded, setExpanded] = useState(false);

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const getAge = (dob: string | null) => { if (!dob) return null; return Math.floor((Date.now() - new Date(dob).getTime()) / 31557600000); };
  const getScoreColor = (score: number | null) => { if (score === null) return "text-slate-500"; if (score >= 80) return "text-emerald-400"; if (score >= 50) return "text-amber-400"; return "text-red-400"; };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-colors">
      <div className="p-4 flex items-center gap-4">
        <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center flex-shrink-0">
          {patient.avatar_url ? <img src={patient.avatar_url} alt={patient.full_name} className="w-full h-full rounded-full object-cover" /> : <span className="text-lg font-bold text-slate-400">{getInitials(patient.full_name)}</span>}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-white truncate">{patient.full_name}</h3>
            {patient.core_score !== null && <span className={`text-xs font-bold ${getScoreColor(patient.core_score)}`}>{patient.core_score}</span>}
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
            {patient.phone && <span>{patient.phone}</span>}
            {getAge(patient.date_of_birth) && <span>{getAge(patient.date_of_birth)}y</span>}
            {patient.gender && <span className="uppercase">{patient.gender}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onBook?.(patient.id)} className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors" title="Book Appointment">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          </button>
          <button onClick={() => setExpanded(!expanded)} className="p-2 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <svg className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
          </button>
        </div>
      </div>
      {expanded && (
        <div className="px-4 pb-4 border-t border-slate-800 pt-3 space-y-2">
          {patient.email && <div className="flex items-center gap-2 text-sm text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>{patient.email}</div>}
          {patient.last_visit && <div className="flex items-center gap-2 text-sm text-slate-400"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>Last visit: {new Date(patient.last_visit).toLocaleDateString()}</div>}
          <div className="flex gap-2 mt-3">
            <button onClick={() => onEdit?.(patient.id)} className="flex-1 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition-colors">Edit</button>
            <button onClick={() => onViewHistory?.(patient.id)} className="flex-1 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 hover:bg-slate-700 transition-colors">History</button>
          </div>
        </div>
      )}
    </div>
  );
}
