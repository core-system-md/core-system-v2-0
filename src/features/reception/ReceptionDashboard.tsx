import { useAuth } from "@/core/auth/AuthProvider";
import { Calendar, Users, ClipboardList, Phone } from "lucide-react";

export default function ReceptionDashboard() {
  const { fullName } = useAuth();
  return (
    <div className="p-6 max-w-6xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-white mb-2">لوحة الاستقبال</h1>
      <p className="text-white/60 mb-8">مرحباً {fullName || "موظف الاستقبال"}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <Users className="w-5 h-5 text-blue-400 mb-2" />
          <span className="text-white/70 text-sm">المرضى في الانتظار</span>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <Calendar className="w-5 h-5 text-green-400 mb-2" />
          <span className="text-white/70 text-sm">مواعيد اليوم</span>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <ClipboardList className="w-5 h-5 text-yellow-400 mb-2" />
          <span className="text-white/70 text-sm">الاستفسارات</span>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <Phone className="w-5 h-5 text-purple-400 mb-2" />
          <span className="text-white/70 text-sm">متابعات</span>
          <p className="text-2xl font-bold text-white">0</p>
        </div>
      </div>
      <div className="mt-8 bg-white/5 border border-white/10 rounded-xl p-8 text-center">
        <h2 className="text-xl font-semibold text-white mb-4">Live Queue Board</h2>
        <p className="text-white/50">قيد التطوير</p>
      </div>
    </div>
  );
}
