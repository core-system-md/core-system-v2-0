import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { Users, Phone, Activity } from 'lucide-react';
import { backendToDisplay, classifyPatient, getClassColors } from '@/shared/utils/scoreDisplay';

interface Patient {
  id: string;
  full_name: string;
  phone_primary: string | null;
  tenant_id: string;
}

interface SessionInfo {
  id: string;
  session_status: string;
  created_at: string;
  patient_id: string;
  core_score_display: number | null;
}

interface PatientWithData extends Patient {
  core_score: number | null;
  disc_profile: string | null;
  active_session: SessionInfo | null;
}

interface PatientRecord extends Patient {
  created_at?: string;
}

interface ProfileRecord {
  patient_id: string;
  historical_core_score_avg: number | null;
  dominant_disc_profile: string | null;
}

interface SessionRecord extends SessionInfo {
  patient_id: string;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

export default function DoctorPatientList() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientWithData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      const tenant_id = localStorage.getItem('tenant_id');
      if (!tenant_id) {
        toast.error('معرف المستأجر مفقود — أعد تسجيل الدخول');
        navigate('/login');
        return;
      }

      setLoading(true);
      try {
        const { data: patientsData, error: patientsError } = await supabase
          .from('clinic_patients')
          .select('id, full_name, phone_primary, tenant_id')
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (patientsError) throw patientsError;
        if (!patientsData || patientsData.length === 0) {
          setPatients([]);
          setLoading(false);
          return;
        }

        const patientIds = patientsData.map((p: PatientRecord) => p.id);

        const { data: profilesData, error: profilesError } = await supabase
          .from('patient_longitudinal_profiles')
          .select('patient_id, historical_core_score_avg, dominant_disc_profile')
          .eq('tenant_id', tenant_id)
          .in('patient_id', patientIds);

        if (profilesError) throw profilesError;

        const { data: sessionsData, error: sessionsError } = await supabase
          .from('clinic_visit_sessions')
          .select('id, session_status, created_at, patient_id, core_score_display')
          .eq('tenant_id', tenant_id)
          .in('patient_id', patientIds)
          .not('session_status', 'in', '("completed","cancelled")')
          .order('created_at', { ascending: false });

        if (sessionsError) throw sessionsError;

        const profileMap = new Map<string, ProfileRecord>();
        (profilesData || []).forEach((p: ProfileRecord) => profileMap.set(p.patient_id, p));

        const sessionMap = new Map<string, SessionRecord>();
        (sessionsData || []).forEach((s: SessionRecord) => {
          if (!sessionMap.has(s.patient_id)) sessionMap.set(s.patient_id, s);
        });

        const mappedPatients: PatientWithData[] = (patientsData || []).map((p: PatientRecord) => {
          const profile = profileMap.get(p.id);
          const session = sessionMap.get(p.id);
          const backendScore = profile?.historical_core_score_avg || null;
          const displayScore = backendScore !== null ? backendToDisplay(backendScore) : null;

          return {
            id: p.id,
            full_name: p.full_name,
            phone_primary: p.phone_primary,
            tenant_id: p.tenant_id,
            core_score: displayScore,
            disc_profile: profile?.dominant_disc_profile || null,
            active_session: session || null
          };
        }).filter((p: PatientWithData) => p.active_session !== null);

        setPatients(mappedPatients);
      } catch (err: unknown) {
        console.error('Patient list fetch error:', err);
        toast.error(getErrorMessage(err, 'فشل في تحميل قائمة المرضى'));
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [navigate]);

  const handlePatientClick = (patient: PatientWithData) => {
    if (!patient.active_session) {
      toast.error('لا توجد جلسة نشطة لهذا المريض');
      return;
    }
    navigate(`/doctor/session/${patient.active_session.id}`);
  };

  const getSlaStatus = (createdAt: string) => {
    const mins = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
    if (mins >= 25) return { color: 'bg-red-500', label: 'تجاوز' };
    if (mins >= 15) return { color: 'bg-yellow-500', label: 'تحذير' };
    return { color: 'bg-green-500', label: 'آمن' };
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 bg-white/10 rounded w-1/4 animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white/10 rounded animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">قائمة المرضى</h1>
        <span className="text-white/50 text-sm">{patients.length} مريض في الانتظار</span>
      </div>

      {patients.length === 0 ? (
        <div className="text-center py-12 text-white/50">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">لا يوجد مرضى في الانتظار</p>
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map(patient => {
            const score = patient.core_score;
            const patientClass = classifyPatient(score);
            const colors = getClassColors(patientClass);
            const sla = patient.active_session ? getSlaStatus(patient.active_session.created_at) : null;

            return (
              <div key={patient.id} onClick={() => handlePatientClick(patient)}
                className="border border-white/10 rounded-xl p-4 hover:shadow-lg transition cursor-pointer bg-white/5 hover:bg-white/10">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className="text-lg font-semibold text-white">{patient.full_name}</h2>
                      {patient.disc_profile && (
                        <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded text-xs">
                          {patient.disc_profile}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      {patient.phone_primary && (
                        <span className="flex items-center gap-1 text-white/50">
                          <Phone className="w-3 h-3" /> {patient.phone_primary}
                        </span>
                      )}
                      {patient.active_session && (
                        <span className="flex items-center gap-1 text-white/50">
                          <Activity className="w-3 h-3" />
                          {patient.active_session.session_status === 'waiting' ? 'في الانتظار' :
                           patient.active_session.session_status === 'in_consultation' ? 'جارية' :
                           patient.active_session.session_status}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2">
                    {score !== null && (
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${colors.bg}`}>
                        <span className={`text-lg font-bold ${colors.text}`}>{score.toFixed(1)}</span>
                        <span className={`text-xs ${colors.text} opacity-70`}>{patientClass}</span>
                      </div>
                    )}
                    {sla && (
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${sla.color}`} />
                        <span className="text-xs text-white/50">{sla.label}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
