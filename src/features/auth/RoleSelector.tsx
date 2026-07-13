import { Shield, Stethoscope, ClipboardList, Crown } from 'lucide-react';

interface RoleSelectorProps {
  selectedRole: string | null;
  onSelect: (role: string) => void;
}

const ROLES = [
  { id: 'doctor', label: 'Doctor', labelAr: 'طبيب', icon: Stethoscope, color: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100' },
  { id: 'receptionist', label: 'Reception', labelAr: 'استقبال', icon: ClipboardList, color: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100' },
  { id: 'clinic_admin', label: 'Admin', labelAr: 'مدير', icon: Shield, color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  { id: 'super_admin', label: 'Super Admin', labelAr: 'مدير عام', icon: Crown, color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
];

export default function RoleSelector({ selectedRole, onSelect }: RoleSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-3" dir="rtl">
      {ROLES.map((r) => {
        const Icon = r.icon;
        const isSelected = selectedRole === r.id;
        return (
          <button
            key={r.id}
            onClick={() => onSelect(r.id)}
            className={`flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all ${isSelected ? `${r.color} ring-2 ring-offset-2 ring-[#1B2A4A]` : 'border-slate-200 bg-white hover:border-slate-300'}`}
          >
            <Icon className="h-6 w-6" />
            <div className="text-center">
              <p className="text-sm font-semibold">{r.labelAr}</p>
              <p className="text-xs text-slate-500">{r.label}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
