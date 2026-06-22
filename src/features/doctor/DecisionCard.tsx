// ============================================
// DecisionCard.tsx
// Sacred: Doctor's clinical decision interface per Constitution §4 + §6
// Shows: Core Score, DISC, Patient Info, Procedure Selection, Notes, Close Session
// ============================================
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/supabase/client';
import { CoreScoreMeter } from '@/shared/components/ui/CoreScoreMeter';
import { SlaTimer } from '@/shared/components/ui/SlaTimer';
import { toast } from 'sonner';

interface DecisionCardProps {
  sessionId: string;
  tenantId: string;
}

interface SessionData {
  id: string;
  patient_id: string;
  core_score_display: number;
  session_status: string;
  scheduled_start: string;
  created_at: string;
}

interface PatientData {
  id: string;
  full_name: string;
  phone_primary: string;
  dominant_disc_profile: string | null;
}

interface Procedure {
  id: string;
  name_ar: string;
  price_subunits: number;
  category: string;
}

export const DecisionCard: React.FC<DecisionCardProps> = ({ sessionId, tenantId }) => {
  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [procedures, setProcedures] = useState<Procedure[]>([]);
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSessionData();
  }, [sessionId, tenantId]);

  const fetchSessionData = async () => {
    setLoading(true);
    try {
      // Step 1: Fetch session with tenant_id filter (Constitution §2.6)
      const { data: sessionData, error: sessionError } = await supabase
        .from('clinic_visit_sessions')
        .select('id, patient_id, core_score_display, session_status, scheduled_start, created_at')
        .eq('id', sessionId)
        .eq('tenant_id', tenantId)
        .single();

      if (sessionError || !sessionData) {
        toast.error('الجلسة غير موجودة');
        navigate('/doctor');
        return;
      }

      setSession(sessionData);

      // Step 2: Fetch patient with tenant_id filter
      const { data: patientData, error: patientError } = await supabase
        .from('clinic_patients')
        .select('id, full_name, phone_primary, dominant_disc_profile')
        .eq('id', sessionData.patient_id)
        .eq('tenant_id', tenantId)
        .single();

      if (patientError) {
        toast.error('خطأ في جلب بيانات المريض');
      } else {
        setPatient(patientData);
      }

      // Step 3: Fetch procedures for this tenant
      const { data: proceduresData } = await supabase
        .from('clinic_procedures')
        .select('id, name_ar, price_subunits, category')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('category', { ascending: true });

      setProcedures(proceduresData || []);
    } catch (err) {
      toast.error('خطأ غير متوقع');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const toggleProcedure = (procedureId: string) => {
    setSelectedProcedures(prev =>
      prev.includes(procedureId)
        ? prev.filter(id => id !== procedureId)
        : [...prev, procedureId]
    );
  };

  const handleSave = async () => {
    if (!session || !patient) return;
    setSaving(true);

    try {
      // Update session with notes and selected procedures
      const { error } = await supabase
        .from('clinic_visit_sessions')
        .update({
          clinical_notes: clinicalNotes,
          selected_procedures: selectedProcedures,
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('tenant_id', tenantId);

      if (error) {
        toast.error('فشل الحفظ: ' + error.message);
      } else {
        toast.success('تم حفظ المسودة');
      }
    } catch (err) {
      toast.error('خطأ في الحفظ');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleCloseSession = async () => {
    if (!session || !patient) return;
    setSaving(true);

    try {
      // Step 1: Create invoice (receptionist will see it, doctor cannot — Constitution §6)
      const selectedProcs = procedures.filter(p => selectedProcedures.includes(p.id));
      const totalSubunits = selectedProcs.reduce((sum, p) => sum + p.price_subunits, 0);

      if (selectedProcedures.length > 0) {
        const { error: invoiceError } = await supabase
          .from('clinic_invoices')
          .insert({
            tenant_id: tenantId,
            session_id: sessionId,
            patient_id: patient.id,
            total_amount_subunits: totalSubunits,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (invoiceError) {
          toast.error('فشل إنشاء الفاتورة');
          console.error(invoiceError);
        }
      }

      // Step 2: Close session
      const { error: closeError } = await supabase
        .from('clinic_visit_sessions')
        .update({
          session_status: 'completed',
          ended_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', sessionId)
        .eq('tenant_id', tenantId);

      if (closeError) {
        toast.error('فشل إغلاق الجلسة');
      } else {
        toast.success('تم إغلاق الجلسة بنجاح');
        navigate('/doctor');
      }
    } catch (err) {
      toast.error('خطأ في إغلاق الجلسة');
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!session || !patient) {
    return (
      <div className="flex items-center justify-center h-96 text-red-500">
        بيانات الجلسة غير متوفرة
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6" dir="rtl">
      {/* Header: Patient Info + SLA + Core Score */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-gray-900">{patient.full_name}</h2>
            <p className="text-gray-500 mt-1">{patient.phone_primary}</p>
            {patient.dominant_disc_profile && (
              <span className="inline-block mt-2 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                DISC: {patient.dominant_disc_profile}
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-4">
            <SlaTimer scheduledStart={session.scheduled_start} size="lg" />
            <CoreScoreMeter score={session.core_score_display} size="lg" />
          </div>
        </div>
      </div>

      {/* Procedures Selection */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">الإجراءات الطبية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {procedures.map(proc => (
            <button
              key={proc.id}
              onClick={() => toggleProcedure(proc.id)}
              className={`p-4 rounded-lg border-2 text-right transition-all ${
                selectedProcedures.includes(proc.id)
                  ? 'border-primary bg-primary/5'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-medium">{proc.name_ar}</div>
              <div className="text-sm text-gray-500 mt-1">
                {(proc.price_subunits / 1000).toFixed(3)} JOD
              </div>
            </button>
          ))}
        </div>
        {procedures.length === 0 && (
          <p className="text-gray-400 text-center py-4">لا توجد إجراءات متاحة</p>
        )}
      </div>

      {/* Clinical Notes */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold mb-4 text-gray-900">ملاحظات سريرية</h3>
        <textarea
          value={clinicalNotes}
          onChange={e => setClinicalNotes(e.target.value)}
          placeholder="اكتب ملاحظاتك هنا..."
          className="w-full min-h-[120px] p-4 rounded-lg border border-gray-200 focus:border-primary focus:ring-1 focus:ring-primary resize-y"
          dir="rtl"
        />
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 px-6 rounded-lg bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
        >
          {saving ? 'جاري الحفظ...' : 'حفظ المسودة'}
        </button>
        <button
          onClick={handleCloseSession}
          disabled={saving}
          className="flex-1 py-3 px-6 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'جاري الإغلاق...' : 'إغلاق الجلسة'}
        </button>
      </div>
    </div>
  );
};
