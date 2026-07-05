import { useAuthStore } from "@/shared/store/authStore";
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import CoreScoreMeter from '@/shared/components/ui/CoreScoreMeter';
import SlaTimer from '@/shared/components/ui/SlaTimer';
import { ArrowRight, Save, CheckCircle, FileText, Calculator, RefreshCw } from 'lucide-react';

interface SessionData {
  id: string;
  patient_id: string;
  session_status: string;
  created_at: string;
  score_aps: number | null;
  score_dri: number | null;
  score_tsi: number | null;
  score_uri: number | null;
  score_pqs: number | null;
  score_rvs: number | null;
  core_score_backend: number | null;
  core_score_display: number | null;
  patient_class: string | null;
  doctor_notes: string | null;
  par_result: string | null;
  is_insured: boolean;
}

interface PatientData {
  id: string;
  full_name: string;
  phone_primary: string | null;
  date_of_birth: string | null;
  gender: string | null;
}

interface LongitudinalData {
  dominant_disc_profile: string | null;
  total_visits: number | null;
  total_revenue_subunits: number | null;
  loyalty_tier: string | null;
  historical_core_score_avg: number | null;
  last_visit_date: string | null;
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

const PAR_OPTIONS = [
  { value: 'full_acceptance', label: 'قبول كامل', color: 'bg-green-500/20 text-green-400' },
  { value: 'partial_acceptance', label: 'قبول جزئي', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'deferred', label: 'مؤجل', color: 'bg-yellow-500/20 text-yellow-400' },
  { value: 'rejection', label: 'رفض', color: 'bg-red-500/20 text-red-400' },
] as const;

const DEFAULT_INDICATORS = {
  APS: 850,
  DRI: 800,
  RVS: 750,
  URI: 700,
  TSI: 650,
  PQS: 300
};

export default function DecisionCard() {
  const { id } = useParams<{ id: string }>();

  // ─── TENANT GUARD ───
  const tenant_id = useAuthStore((s) => s.tenant_id);
  const user = useAuthStore((s) => s.user);

  if (!tenant_id) {
    return (
      <div className="p-8 text-center text-red-500" dir="rtl">
        <p>Tenant not initialized</p>
      </div>
    );
  }

  const navigate = useNavigate();
  const [session, setSession] = useState<SessionData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [longitudinal, setLongitudinal] = useState<LongitudinalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState('');
  const [selectedPar, setSelectedPar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);

  const [indicators, setIndicators] = useState({
    APS: DEFAULT_INDICATORS.APS,
    DRI: DEFAULT_INDICATORS.DRI,
    RVS: DEFAULT_INDICATORS.RVS,
    URI: DEFAULT_INDICATORS.URI,
    TSI: DEFAULT_INDICATORS.TSI,
    PQS: DEFAULT_INDICATORS.PQS
  });

  useEffect(() => { if (id) fetchSessionData(); }, [id]);

  const fetchSessionData = async () => {
    if (!tenant_id) { toast.error('معرف المستأجر مفقود'); return; }

    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('clinic_visit_sessions').select('*').eq('id', id!).eq('tenant_id', tenant_id).single();
      if (sessionError) throw sessionError;
      setSession(sessionData);
      setNotes(sessionData.doctor_notes || '');
      setSelectedPar(sessionData.par_result);

      setIndicators({
        APS: sessionData.score_aps ?? DEFAULT_INDICATORS.APS,
        DRI: sessionData.score_dri ?? DEFAULT_INDICATORS.DRI,
        RVS: sessionData.score_rvs ?? DEFAULT_INDICATORS.RVS,
        URI: sessionData.score_uri ?? DEFAULT_INDICATORS.URI,
        TSI: sessionData.score_tsi ?? DEFAULT_INDICATORS.TSI,
        PQS: sessionData.score_pqs ?? DEFAULT_INDICATORS.PQS
      });

      const { data: patientData, error: patientError } = await supabase
        .from('clinic_patients').select('id, full_name, phone_primary, date_of_birth, gender')
        .eq('id', sessionData.patient_id!).eq('tenant_id', tenant_id).single();
      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: longData, error: longError } = await supabase
        .from('patient_longitudinal_profiles').select('dominant_disc_profile, total_visits, total_revenue_subunits, loyalty_tier, historical_core_score_avg, last_visit_date')
        .eq('patient_id', sessionData.patient_id!).eq('tenant_id', tenant_id).single();
      if (longError && longError.code !== 'PGRST116') throw longError;
      setLongitudinal(longData);
    } catch (err: unknown) {
      console.error('Session fetch error:', err);
      toast.error(getErrorMessage(err, 'فشل في تحميل بيانات الجلسة'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const { error } = await supabase.from('clinic_visit_sessions').update({
        doctor_notes: notes, par_result: selectedPar, updated_at: new Date().toISOString()
      }).eq('id', id).eq('tenant_id', tenant_id);
      if (error) throw error;
      toast.success('تم حفظ الملاحظات');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'فشل في الحفظ'));
    } finally {
      setSaving(false);
    }
  };

  const handleCalculateScore = async () => {
    if (!id || !session) return;
    setCalculating(true);
    try {
      const { error: updateError } = await supabase
        .from('clinic_visit_sessions')
        .update({
          score_aps: indicators.APS,
          score_dri: indicators.DRI,
          score_rvs: indicators.RVS,
          score_uri: indicators.URI,
          score_tsi: indicators.TSI,
          score_pqs: indicators.PQS,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (updateError) throw updateError;

      const { data, error } = await supabase.functions.invoke('score-calculator', {
        body: {
          indicators: {
            APS: indicators.APS,
            DRI: indicators.DRI,
            RVS: indicators.RVS,
            URI: indicators.URI,
            TSI: indicators.TSI,
            PQS: indicators.PQS
          },
          historicalAvg: longitudinal?.historical_core_score_avg,
          lastVisitDate: longitudinal?.last_visit_date,
          sessionId: id,
          tenantId: tenant_id
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast.success(`تم حساب Core Score: ${data.display} (${data.patientClass})`);
        fetchSessionData();
      } else {
        throw new Error(data?.error || 'فشل في حساب الدرجة');
      }
    } catch (err: unknown) {
      console.error('Score calculation error:', err);
      toast.error(getErrorMessage(err, 'فشل في حساب Core Score'));
    } finally {
      setCalculating(false);
    }
  };

  const handleCloseSession = async () => {
    if (!id) return;
    if (!confirm('هل أنت متأكد من إغلاق الجلسة؟')) return;
    try {
      const { error } = await supabase.from('clinic_visit_sessions').update({
        session_status: 'completed', session_ended_at: new Date().toISOString(), updated_at: new Date().toISOString()
      }).eq('id', id).eq('tenant_id', tenant_id);
      if (error) throw error;
      toast.success('تم إغلاق الجلسة');
      navigate('/doctor');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'فشل في إغلاق الجلسة'));
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4" dir="rtl">
        <div className="h-8 bg-white/10 rounded w-1/3 animate-pulse" />
        <div className="h-32 bg-white/10 rounded animate-pulse" />
        <div className="h-48 bg-white/10 rounded animate-pulse" />
      </div>
    );
  }

  if (!session || !patient) {
    return (
      <div className="p-8 text-center text-white/50" dir="rtl">
        <p>لا توجد بيانات للجلسة</p>
        <button onClick={() => navigate('/doctor')} className="mt-4 text-blue-400 hover:underline">العودة للقائمة</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <button onClick={() => navigate('/doctor')} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors">
          <ArrowRight className="w-5 h-5" /> <span>العودة للقائمة</span>
        </button>
        <SlaTimer createdAt={session.created_at} />
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white mb-2">{patient.full_name}</h1>
            <div className="flex items-center gap-4 text-sm text-white/50">
              {patient.phone_primary && <span>{patient.phone_primary}</span>}
              {patient.gender && <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>}
              {longitudinal && <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded">{longitudinal.loyalty_tier}</span>}
            </div>
          </div>
          <CoreScoreMeter backendScore={session.core_score_backend} size="lg" />
        </div>

        {longitudinal?.dominant_disc_profile && (
          <div className="mt-4 flex items-center gap-2">
            <span className="text-white/50 text-sm">نمط السلوك:</span>
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 rounded-lg text-sm">{longitudinal.dominant_disc_profile}</span>
          </div>
        )}

        {session.is_insured && (
          <div className="mt-3 inline-flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
            <CheckCircle className="w-3 h-3" /> مؤمن
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-blue-400" /> حساب Core Score
          </h2>
          <button onClick={handleCalculateScore} disabled={calculating}
            className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 disabled:bg-white/5 text-blue-400 rounded-lg transition-colors flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
            {calculating ? 'جاري الحساب...' : 'حساب الدرجة'}
          </button>
        </div>

        <p className="text-white/50 text-sm mb-4">Constitution §4: Formula MUST be in Backend (Edge Function)</p>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'APS', key: 'APS' as const, weight: '28%' },
            { label: 'DRI', key: 'DRI' as const, weight: '24%' },
            { label: 'RVS', key: 'RVS' as const, weight: '20%' },
            { label: 'URI', key: 'URI' as const, weight: '15%' },
            { label: 'TSI', key: 'TSI' as const, weight: '13%' },
            { label: 'PQS', key: 'PQS' as const, weight: 'Penalty' },
          ].map((indicator) => (
            <div key={indicator.label} className="bg-white/5 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-white/50 text-sm">{indicator.label}</span>
                <span className="text-white/30 text-xs">{indicator.weight}</span>
              </div>
              <input 
                type="number" 
                min="0" 
                max="1000"
                value={indicators[indicator.key]}
                onChange={(e) => setIndicators(prev => ({ ...prev, [indicator.key]: Number(e.target.value) }))}
                className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-white text-center focus:outline-none focus:border-white/30"
              />
            </div>
          ))}
        </div>

        {session.core_score_backend && (
          <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm">
              ✓ آخر درجة محسوبة: <strong>{session.core_score_display}</strong> ({session.patient_class})
            </p>
          </div>
        )}
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4">قرار القبول (PAR)</h2>
        <div className="grid grid-cols-2 gap-3">
          {PAR_OPTIONS.map((option) => (
            <button key={option.value} onClick={() => setSelectedPar(option.value)}
              className={`p-3 rounded-lg border transition-colors text-sm font-medium ${selectedPar === option.value ? `${option.color} border-white/30` : 'bg-white/5 border-white/10 text-white/50 hover:bg-white/10'}`}>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-yellow-400" /> ملاحظات طبية
        </h2>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={6}
          className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30 resize-none"
          placeholder="اكتب ملاحظاتك الطبية هنا..." />
      </div>

      <div className="flex gap-3">
        <button onClick={handleSave} disabled={saving}
          className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <Save className="w-4 h-4" /> {saving ? 'جاري الحفظ...' : 'حفظ الملاحظات'}
        </button>
        <button onClick={handleCloseSession}
          className="flex-1 bg-green-500/20 hover:bg-green-500/30 text-green-400 font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4" /> إغلاق الجلسة
        </button>
      </div>
    </div>
  );
}