// ============================================================
// CORE SYSTEM v2.1 — DoctorPatientList
// Constitution §2.6 (tenant_id), §4.2 (Core Score), §5 (SLA)
// ============================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { CoreScoreMeter } from '@/shared/components/ui/CoreScoreMeter';
import { SlaTimer } from '@/shared/components/ui/SlaTimer';

interface Patient {
  id: string;
  full_name: string;
  phone: string | null;
  core_score_display: number | null;
  disc_profile: string | null;
  tenant_id: string;
}

interface SessionInfo {
  id: string;
  status: string;
  created_at: string;
  patient_id: string;
}

interface PatientWithSession extends Patient {
  active_session: SessionInfo | null;
}

export default function DoctorPatientList() {
  const navigate = useNavigate();
  const [patients, setPatients] = useState<PatientWithSession[]>([]);
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
        const { data, error } = await supabase
          .from('clinic_patients')
          .select(`
            id,
            full_name,
            phone,
            core_score_display,
            disc_profile,
            tenant_id,
            clinic_visit_sessions (
              id,
              status,
              created_at,
              patient_id
            )
          `)
          .eq('tenant_id', tenant_id)
          .is('deleted_at', null)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const mappedPatients: PatientWithSession[] = (data || []).map((p: any) => {
          const sessions = p.clinic_visit_sessions as SessionInfo[] | null;
          const activeSession = sessions?.find(s => s.status !== 'closed') || null;
          
          return {
            id: p.id,
            full_name: p.full_name,
            phone: p.phone,
            core_score_display: p.core_score_display,
            disc_profile: p.disc_profile,
            tenant_id: p.tenant_id,
            active_session: activeSession
          };
        }).filter((p: PatientWithSession) => p.active_session !== null);

        setPatients(mappedPatients);

      } catch (err: any) {
        console.error('Patient list fetch error:', err);
        toast.error(err.message || 'فشل في تحميل قائمة المرضى');
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [navigate]);

  const handlePatientClick = (patient: PatientWithSession) => {
    if (!patient.active_session) {
      toast.error('لا توجد جلسة نشطة لهذا المريض');
      return;
    }

    const sessionId = patient.active_session.id;
    console.log('Navigating to session:', sessionId);
    
    navigate(`/doctor/session/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 bg-gray-200 rounded w-1/4 animate-pulse" />
        {[1, 2, 3].map(i => (
          <div key={i} className="h-24 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-[#1B2A4A] mb-6">
        قائمة المرضى
      </h1>

      {patients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">لا يوجد مرضى في الانتظار</p>
          <p className="text-sm mt-2">سيتم تحديث القائمة تلقائياً</p>
        </div>
      ) : (
        <div className="space-y-4">
          {patients.map(patient => (
            <div
              key={patient.id}
              onClick={() => handlePatientClick(patient)}
              className="border rounded-lg p-4 hover:shadow-md transition cursor-pointer
                         bg-white hover:bg-gray-50"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-[#1B2A4A]">
                    {patient.full_name}
                  </h2>
                  <p className="text-gray-500 text-sm mt-1">
                    {patient.phone || 'لا يوجد هاتف'}
                  </p>
                  {patient.disc_profile && (
                    <span className="inline-block mt-2 px-2 py-0.5 bg-blue-100 text-blue-800 
                                     rounded text-xs">
                      {patient.disc_profile}
                    </span>
                  )}
                </div>
                <div className="text-left space-y-2">
                  <CoreScoreMeter 
                    score={patient.core_score_display ?? 0} 
                  />
                  {patient.active_session && (
                    <SlaTimer 
                      created_at={patient.active_session.created_at} 
                    />
                  )}
                </div>
              </div>
              
              {patient.active_session && (
                <div className="mt-3 flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${
                    patient.active_session.status === 'waiting' ? 'bg-yellow-400' :
                    patient.active_session.status === 'in_progress' ? 'bg-green-500' :
                    'bg-gray-400'
                  }`} />
                  <span className="text-xs text-gray-500">
                    {patient.active_session.status === 'waiting' ? 'في الانتظار' :
                     patient.active_session.status === 'in_progress' ? 'جارية' :
                     patient.active_session.status}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
