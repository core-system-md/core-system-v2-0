interface PatientDirectoryProps {
  patients: {
    id: string;
    full_name: string;
    phone: string | null;
    email: string | null;
    last_visit: string | null;
    total_visits: number;
    total_revenue: number;
  }[];
  onView?: (id: string) => void;
}

export function PatientDirectory({ patients, onView }: PatientDirectoryProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">Patient Directory</h2>
        <p className="text-sm text-slate-500">{patients.length} patients</p>
      </div>
      <div className="divide-y divide-slate-800">
        {patients.map((patient) => (
          <div key={patient.id} className="p-4 flex items-center justify-between hover:bg-slate-800/50 transition-colors">
            <div>
              <p className="text-sm font-medium text-white">{patient.full_name}</p>
              <p className="text-xs text-slate-500">{patient.phone || patient.email || "No contact"}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-white">{patient.total_visits} visits</p>
              <p className="text-xs text-slate-500">${patient.total_revenue.toLocaleString()} total</p>
            </div>
            {onView && <button onClick={() => onView(patient.id)} className="ml-4 px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 text-xs hover:bg-purple-500/20 transition-colors">View</button>}
          </div>
        ))}
      </div>
    </div>
  );
}
