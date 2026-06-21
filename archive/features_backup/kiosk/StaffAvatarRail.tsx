import { useEffect, useState } from "react";
import { supabase } from "../../infrastructure/supabase/client";

interface StaffMember {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: string;
  is_online: boolean;
}

interface StaffAvatarRailProps {
  tenantId: string;
  onStaffSelect?: (staff: StaffMember) => void;
}

export function StaffAvatarRail({ tenantId, onStaffSelect }: StaffAvatarRailProps) {
  const [staff, setStaff] = useState<StaffMember[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    const fetchStaff = async () => {
      const { data } = await supabase.from("clinic_staff").select("id, full_name, avatar_url, role, is_online").eq("tenant_id", tenantId).eq("is_active", true).order("full_name");
      setStaff(data || []);
    };
    fetchStaff();
  }, [tenantId]);

  const getInitials = (name: string) => name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const getRoleColor = (role: string) => {
    switch (role.toLowerCase()) {
      case "doctor": return "ring-emerald-500";
      case "nurse": return "ring-blue-500";
      case "receptionist": return "ring-amber-500";
      default: return "ring-slate-500";
    }
  };

  return (
    <div className="w-full bg-slate-900/80 backdrop-blur-md border-t border-slate-700 py-4">
      <div className="flex items-center gap-6 overflow-x-auto px-6 scrollbar-hide">
        <span className="text-slate-400 text-sm font-medium whitespace-nowrap uppercase tracking-wider">On Duty</span>
        {staff.length === 0 && <span className="text-slate-600 text-sm">No staff on duty</span>}
        {staff.map((member) => (
          <button key={member.id} onClick={() => onStaffSelect?.(member)} className="flex flex-col items-center gap-2 min-w-[80px] group">
            <div className={`relative w-14 h-14 rounded-full ring-2 ${getRoleColor(member.role)} overflow-hidden bg-slate-800 flex items-center justify-center transition-transform group-hover:scale-110`}>
              {member.avatar_url ? <img src={member.avatar_url} alt={member.full_name} className="w-full h-full object-cover" /> : <span className="text-lg font-bold text-slate-300">{getInitials(member.full_name)}</span>}
              {member.is_online && <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />}
            </div>
            <span className="text-xs text-slate-300 text-center max-w-[80px] truncate">{member.full_name}</span>
            <span className="text-[10px] text-slate-500 uppercase">{member.role}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
