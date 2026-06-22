// ============================================
// DoctorPatientList.tsx
// Modified: Added click-to-open DecisionCard per Constitution §4
// ============================================
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/supabase/client';
import { CoreScoreMeter } from '@/shared/components/ui/CoreScoreMeter';
import { SlaTimer } from '@/shared/components/ui/SlaTimer';
import { toast } from 'sonner';

interface PatientSession {
  id: string;
  patient_id: string;
  full_name: string;
  phone_primary: string;
  core_score_display: number;
  session_status: string;
  scheduled_start: string;
}

export const DoctorPatientList: React.FC = () => {
  const navigate = useNavigate();
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<PatientSession[]>([]);
  const [loading, setLoading] = useState(true);

  // Get tenantId from localStorage or Zustand store
  useEffect(() => {
    const stored = localStorage.getItem('tenant_id');
    if (stored) setTenantId(stored);
  }, []);

  useEffect(() => {
    if (tenantId) fetchTodaySessions();
  }, [tenantId]);

  const fetchTodaySessions = async () => {
    if (!tenantId) {
      toast.error('معرف العيادة غير متوفر');
      return;
    }

    setLoading(true);
    const today = new Date().toISOString().split('T')[0];

    try {
      // Step 1: Fetch sessions with tenant_id filter (Constitution §2.6)
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('clinic_visit_sessions')
        .select('id, patient_id, core_score_display, session_status, scheduled_start')
        .eq('tenant_id', tenantId)
        .in('session_status', ['waiting', 'scheduled', 'in_progress'])
        .gte('scheduled_start', `${today}T00:00:00`)
        .lte('scheduled_start', `${today}T23:59:59`)
        .eq('is_abandoned', false)
        .order('scheduled_start', { ascending: true });

      if (sessionsError) {
        toast.error('خطأ في جلب الجلسات');
        console.error(sessionsError);
        setLoading(false);
        return;
      }

      const sessionList = sessionsData || [];
      const patientIds = sessionList.map((s: any) => s.patient_id).filter(Boolean);

      // Step 2: Fetch patients separately with tenant_id filter (Constitution §2.6)
      let patientMap: Record<string, { full_name: string; phone_primary: string }> = {};
      if (patientIds.length > 0) {
        const { data: patientsData, error: patientsError } = await supabase
          .from('clinic_patients')
          .select('id, full_name, phone_primary')
          .eq('tenant_id', tenantId)
          .in('id', patientIds);

        if (patientsError) {
          toast.error('خطأ في جلب بيانات المرضى');
          console.error(patientsError);
        } else {
          patientMap = (patientsData || []).reduce((acc: any, p: any) => {
            acc[p.id] = { full_name: p.full_name, phone_primary: p.phone_primary };
            return acc;
          }, {} as Record<string, { full_name: string; phone_primary: string }>);
        }
      }

      // Merge session + patient data
      const merged: PatientSession[] = sessionList.map((s: any) => ({
        id: s.id,
        patient_id: s.patient_id,
        full_name: patientMap[s.patient_id]?.full_name || 'غير معروف',
        phone_primary: patientMap[s.patient_id]?.phone_primary || '',
        core_score_display: s.core_score_display || 0,
        session_status: s.session_status,
        scheduled_start: s.scheduled_start,
      }));

      setSessions(merged);
    } catch (err) {
      toast.error('خطأ غير متوقع');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { bg: string; text: string; label: string }> = {
      waiting: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'في الانتظار' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'مجدول' },
      in_progress: { bg: 'bg-green-100', text: 'text-green-800', label: 'جاري' },
    };
    const config = configs[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: 'غير معروف' };
    return (
      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const handlePatientClick = (sessionId: string) => {
    navigate(`/doctor/session/${sessionId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <p className="text-lg">لا يوجد مرضى مجدولون لهذا اليوم</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4" dir="rtl">
      <h2 className="text-xl font-bold text-gray-900 mb-4">مرضى اليوم</h2>
      {sessions.map(session => (
        <div
          key={session.id}
          onClick={() => handlePatientClick(session.id)}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer"
        >
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{session.full_name}</h3>
                {getStatusBadge(session.session_status)}
              </div>
              <p className="text-sm text-gray-500 mt-1">{session.phone_primary}</p>
            </div>

            <div className="flex items-center gap-4">
              <SlaTimer scheduledStart={session.scheduled_start} size="sm" />
              <CoreScoreMeter score={session.core_score_display} size="sm" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};