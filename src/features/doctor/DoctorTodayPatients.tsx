import { useEffect, useState } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { toast } from 'sonner';

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  phone_primary: string;
  created_at: string;
  notes: string | null;
}

export function DoctorTodayPatients() {
  // ─── TENANT GUARD ONLY ───
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  if (!tenantId) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-red-500 font-semibold">Tenant not initialized</p>
      </div>
    );
  }

  const [patients, setPatients] = useState<Patient[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchTodayPatients();
  }, [tenantId]);

  const fetchTodayPatients = async () => {
    setIsLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      const { data, error } = await supabase
        .from('clinic_patients')
        .select('id, first_name, last_name, phone_primary, created_at, notes')
        .eq('tenant_id', tenantId)
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        toast.error(`خطأ في جلب البيانات: ${error.message}`);
        return;
      }

      setPatients(data || []);
    } catch (err: any) {
      toast.error(err?.message || 'حدث خطأ');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePatientClick = (patient: Patient) => {
    toast.info(`فتح ملف المريض: ${patient.first_name}`);
  };

  if (isLoading) {
    return (
      <div className="p-6 text-center" dir="rtl">
        <p className="text-gray-500">جاري تحميل قائمة المرضى...</p>
      </div>
    );
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold text-[#1B2A4A]">
          مرضى اليوم — {user?.full_name || 'الطبيب'}
        </h2>
        <span className="text-sm text-gray-500">
          {patients.length} مريض
        </span>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500">لا يوجد مرضى مسجلين اليوم</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => (
            <button
              key={patient.id}
              onClick={() => handlePatientClick(patient)}
              className="w-full text-right p-4 bg-white rounded-lg shadow-sm border border-gray-200 hover:border-[#1B2A4A] hover:shadow-md transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-[#1B2A4A]">
                    {patient.first_name} {patient.last_name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {patient.phone_primary}
                  </p>
                  {patient.notes && (
                    <p className="text-sm text-gray-400 mt-1 truncate">
                      {patient.notes}
                    </p>
                  )}
                </div>
                <span className="text-xs text-gray-400">
                  {new Date(patient.created_at).toLocaleTimeString('ar-JO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}