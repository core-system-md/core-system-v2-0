import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { User, Calendar, Clock, AlertCircle } from 'lucide-react';

interface Patient {
  id: string;
  patient_id: string;
  first_name: string;
  last_name: string;
  phone_primary: string;
  created_at: string;
  session_status?: string;
  waiting_time_minutes?: number | null;
}

export default function DoctorTodayPatients() {
  const navigate = useNavigate();
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPatients() {
      if (!tenantId || !user?.id) return;

      setLoading(true);
      setError(null);

      const today = new Date().toISOString().split('T')[0];

      const { data, error: dbError } = await supabase
        .from('clinic_visit_sessions')
        .select(`
          id,
          session_status,
          waiting_time_minutes,
          created_at,
          clinic_patients!inner(
            id,
            first_name,
            last_name,
            phone_primary
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('doctor_id', user.id)
        .eq('session_status', 'waiting')
        .gte('created_at', `${today}T00:00:00`)
        .lte('created_at', `${today}T23:59:59`)
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      if (dbError) {
        setError(dbError.message);
        setLoading(false);
        return;
      }

      const formatted = (data || []).map((row: any) => ({
        id: row.id,                          // ← FIXED: session ID (was: row.clinic_patients.id)
        patient_id: row.clinic_patients.id,  // ← NEW: patient ID (for future use)
        first_name: row.clinic_patients.first_name,
        last_name: row.clinic_patients.last_name,
        phone_primary: row.clinic_patients.phone_primary,
        created_at: row.created_at,
        session_status: row.session_status,
        waiting_time_minutes: row.waiting_time_minutes,
      }));

      setPatients(formatted);
      setLoading(false);
    }

    fetchPatients();
  }, [tenantId, user?.id]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-4" dir="rtl">
        <div className="h-20 w-full rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-20 w-full rounded-xl bg-slate-200 animate-pulse" />
        <div className="h-20 w-full rounded-xl bg-slate-200 animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6" dir="rtl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-3 pt-6">
            <AlertCircle className="h-6 w-6 text-red-600" />
            <p className="text-red-800">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (patients.length === 0) {
    return (
      <div className="max-w-4xl mx-auto p-6 text-center" dir="rtl">
        <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-700">لا يوجد مرضى اليوم</h2>
        <p className="text-slate-500 mt-2">لم يتم تسجيل أي مرضى في قائمة الانتظار</p>
      </div>
    );
  }

  const handlePatientClick = (patient: Patient) => {
    navigate(`/doctor/session/${patient.id}`);  // ← patient.id = session ID (FIXED)
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      <h1 className="text-2xl font-bold text-slate-900 mb-6">مرضى اليوم</h1>

      {patients.map((patient) => (
        <Card
          key={patient.id}
          className="border-slate-200 hover:border-sky-300 hover:shadow-md transition-all cursor-pointer"
          onClick={() => handlePatientClick(patient)}
        >
          <CardContent className="p-5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center text-white font-bold text-lg shrink-0">
                {patient.first_name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-slate-900">
                  {patient.first_name} {patient.last_name}
                </h3>
                <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(patient.created_at).toLocaleDateString('ar-JO')}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(patient.created_at).toLocaleTimeString('ar-JO', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                  {patient.waiting_time_minutes !== null && (
                    <span className="text-amber-600 font-medium">
                      انتظار: {patient.waiting_time_minutes} د
                    </span>
                  )}
                </div>
              </div>

              <Button variant="outline" className="shrink-0">
                فتح الجلسة
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}