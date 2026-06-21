interface StaffMember {
  id: string;
  name: string;
  role: string;
  patientsSeen: number;
  avgSessionTime: number;
  satisfaction: number;
  status: "online" | "offline" | "busy";
}

interface StaffPerformanceProps {
  staff: StaffMember[];
}

export function StaffPerformance({ staff }: StaffPerformanceProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800">
        <h2 className="text-lg font-semibold text-white">Staff Performance</h2>
      </div>
      <div className="divide-y divide-slate-800">
        {staff.map((member) => (
          <div key={member.id} className="p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center">
              <span className="text-sm font-bold text-slate-400">{member.name.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">{member.name}</span>
                <span className={`w-2 h-2 rounded-full ${member.status === "online" ? "bg-emerald-500" : member.status === "busy" ? "bg-amber-500" : "bg-slate-600"}`} />
              </div>
              <p className="text-xs text-slate-500">{member.role}</p>
            </div>
            <div className="text-right text-sm">
              <p className="text-white font-medium">{member.patientsSeen} patients</p>
              <p className="text-xs text-slate-500">{member.avgSessionTime} min avg</p>
            </div>
            <div className="w-16 text-right">
              <span className={`text-sm font-bold ${member.satisfaction >= 4.5 ? "text-emerald-400" : member.satisfaction >= 3.5 ? "text-amber-400" : "text-red-400"}`}>
                {member.satisfaction.toFixed(1)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
