import { useAuthStore } from "@/shared/store/authStore";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '@/infrastructure/supabase/client';
import { PermissionGuard } from '@/core/permissions/PermissionGuard';
import CoreScoreEngine from '@/core/rules/scoring/CoreScoreEngine';
import CoreScoreMeter from '@/shared/components/ui/CoreScoreMeter';
import SlaTimer from '@/shared/components/ui/SlaTimer';
import { ArrowRight, Save, CheckCircle, Calculator, RefreshCw } from 'lucide-react';

interface SessionData {
  id: string; patient_id: string; session_status: string; created_at: string;
  score_aps: number | null; score_dri: number | null; score_tsi: number | null;
  score_uri: number | null; score_pqs: number | null; score_rvs: number | null;
  core_score_backend: number | null; core_score_display: number | null;
  patient_class: string | null; doctor_notes: string | null; par_result: string | null; is_insured: boolean;
}
interface PatientData {
  id: string; first_name: string | null; last_name: string | null; phone_primary: string | null;
  date_of_birth: string | null; gender: string | null;
}
interface LongitudinalData {
  dominant_disc_profile: string | null; total_visits: number | null;
  total_revenue_subunits: number | null; loyalty_tier: string | null;
  historical_core_score_avg: number | null; last_visit_date: string | null;
}
interface DecisionCardProps { sessionId: string; }
type IndicatorKey = 'APS' | 'DRI' | 'RVS' | 'URI' | 'TSI' | 'PQS';
type IndicatorValues = Record<IndicatorKey, number | null>;

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  return fallback;
}

const PAR_OPTIONS = [
  { value: 'full_acceptance', label: 'قبول كامل', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
  { value: 'partial_acceptance', label: 'قبول جزئي', className: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
  { value: 'deferred', label: 'مؤجل', className: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  { value: 'rejection', label: 'رفض', className: 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' },
] as const;

const INDICATOR_FIELDS: Array<{ label: IndicatorKey; weight: string }> = [
  { label: 'APS', weight: '28%' },
  { label: 'DRI', weight: '24%' },
  { label: 'RVS', weight: '20%' },
  { label: 'URI', weight: '15%' },
  { label: 'TSI', weight: '13%' },
  { label: 'PQS', weight: 'Penalty' },
];

function normalizeIndicator(value: number | null | undefined): number | null {
  return Number.isInteger(value) && value >= 0 && value <= 1000 ? value : null;
}

function hasCompleteIndicators(indicators: IndicatorValues): indicators is Record<IndicatorKey, number> {
  return Object.values(indicators).every((value) => Number.isInteger(value) && value >= 0 && value <= 1000);
}

export default function DecisionCard({ sessionId }: DecisionCardProps) {
  const navigate = useNavigate();
  const tenant_id = useAuthStore((s) => s.tenant_id);
  const [session, setSession] = useState<SessionData | null>(null);
  const [patient, setPatient] = useState<PatientData | null>(null);
  const [longitudinal, setLongitudinal] = useState<LongitudinalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPar, setSelectedPar] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [calculating, setCalculating] = useState(false);
  const [indicators, setIndicators] = useState<IndicatorValues>({
    APS: null,
    DRI: null,
    RVS: null,
    URI: null,
    TSI: null,
    PQS: null,
  });

  useEffect(() => {
    if (sessionId) void fetchSessionData();
  }, [sessionId]);

  if (!tenant_id) {
    return <div className="p-8 text-center text-red-600" dir="rtl"><p>لم تتم تهيئة العيادة بعد</p></div>;
  }

  const fetchSessionData = async () => {
    if (!tenant_id) { toast.error('معرف المستأجر مفقود'); return; }
    if (!sessionId) { toast.error('معرف الجلسة مفقود'); return; }
    setLoading(true);
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from('clinic_visit_sessions')
        .select('*')
        .eq('id', sessionId)
        .eq('tenant_id', tenant_id)
        .is('deleted_at', null)
        .single();
      if (sessionError) throw sessionError;

      setSession(sessionData);
      setSelectedPar(sessionData.par_result);
      setIndicators({
        APS: normalizeIndicator(sessionData.score_aps),
        DRI: normalizeIndicator(sessionData.score_dri),
        RVS: normalizeIndicator(sessionData.score_rvs),
        URI: normalizeIndicator(sessionData.score_uri),
        TSI: normalizeIndicator(sessionData.score_tsi),
        PQS: normalizeIndicator(sessionData.score_pqs),
      });

      const { data: patientData, error: patientError } = await supabase
        .from('clinic_patients')
        .select('id, first_name, last_name, phone_primary, date_of_birth, gender')
        .eq('id', sessionData.patient_id!)
        .eq('tenant_id', tenant_id)
        .is('deleted_at', null)
        .single();
      if (patientError) throw patientError;
      setPatient(patientData);

      const { data: longData, error: longError } = await supabase
        .from('patient_longitudinal_profiles')
        .select('dominant_disc_profile, total_visits, total_revenue_subunits, loyalty_tier, historical_core_score_avg, last_visit_date')
        .eq('patient_id', sessionData.patient_id!)
        .eq('tenant_id', tenant_id)
        .is('deleted_at', null)
        .single();
      if (longError && longError.code !== 'PGRST116') throw longError;
      setLongitudinal(longData);
    } catch (err: unknown) {
      console.error('Session fetch error:', err);
      toast.error(getErrorMessage(err, 'فشل في تحميل بيانات الجلسة'));
    } finally { setLoading(false); }
  };

  const handleSave = async () => {
    if (!sessionId) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('clinic_visit_sessions')
        .update({ par_result: selectedPar, updated_at: new Date().toISOString() })
        .eq('id', sessionId)
        .eq('tenant_id', tenant_id)
        .is('deleted_at', null);
      if (error) throw error;
      toast.success('تم حفظ قرار الجلسة');
    } catch (err: unknown) {
      toast.error(getErrorMessage(err, 'فشل في الحفظ'));
    } finally { setSaving(false); }
  };

  const handleCalculateScore = async () => {
    if (!sessionId || !tenant_id || !session) return;
    if (!hasCompleteIndicators(indicators)) {
      toast.error('لا يمكن حساب CORE قبل توفر جميع المؤشرات الفعلية من 0 إلى 1000');
      return;
    }

    setCalculating(true);
    try {
      const result = await CoreScoreEngine.calculate(indicators, {
        sessionId,
        tenantId: tenant_id,
      });
      toast.success(`تم حساب Core Score: ${result.display} (${result.patientClass})`);
      await fetchSessionData();
    } catch (err: unknown) {
      console.error('Score calculation error:', err);
      toast.error(getErrorMessage(err, 'فشل في حساب Core Score'));
    } finally { setCalculating(false); }
  };

  const updateIndicator = (key: IndicatorKey, value: string) => {
    setIndicators((previous) => ({
      ...previous,
      [key]: value === '' ? null : Number(value),
    }));
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6" dir="rtl">
        <div className="h-8 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-32 animate-pulse rounded-xl bg-slate-200" />
        <div className="h-48 animate-pulse rounded-xl bg-slate-200" />
      </div>
    );
  }

  if (!session || !patient) {
    return (
      <div className="p-8 text-center text-slate-500" dir="rtl">
        <p>لا توجد بيانات للجلسة</p>
        <button onClick={() => navigate('/doctor')} className="mt-4 text-[#1B2A4A] hover:underline">العودة للقائمة</button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-4 md:p-6" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <button onClick={() => navigate('/doctor')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-[#1B2A4A] transition-colors">
          <ArrowRight className="h-4 w-4" />
          العودة للقائمة
        </button>
        <SlaTimer createdAt={session.created_at} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-400">ملف الجلسة</p>
            <h1 className="mt-1 text-2xl font-bold text-[#1B2A4A]">
              {patient.first_name || ''} {patient.last_name || ''}
            </h1>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
              {patient.phone_primary && <span>{patient.phone_primary}</span>}
              {patient.gender && <span>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>}
              {longitudinal?.loyalty_tier && <span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{longitudinal.loyalty_tier}</span>}
            </div>
          </div>
          <div className="shrink-0">
            <CoreScoreMeter backendScore={session.core_score_backend} size="lg" />
          </div>
        </div>

        {session.is_insured && (
          <div className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700">
            <CheckCircle className="h-3.5 w-3.5" />
            مؤمن
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
              <Calculator className="h-5 w-5 text-[#1B2A4A]" />
              مؤشرات Core Score
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              الحساب النهائي يبقى عبر المسار المعتمد في CoreScoreEngine/Edge Function. لا توجد قيم افتراضية غير موثقة.
            </p>
          </div>
          <PermissionGuard required="edit_sessions">
            <button
              type="button"
              onClick={handleCalculateScore}
              disabled={calculating || !hasCompleteIndicators(indicators)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#223A63] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <RefreshCw className={`h-4 w-4 ${calculating ? 'animate-spin' : ''}`} />
              {calculating ? 'جاري الحساب...' : 'حساب الدرجة'}
            </button>
          </PermissionGuard>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {INDICATOR_FIELDS.map((indicator) => (
            <label key={indicator.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <span className="flex items-center justify-between text-sm font-semibold text-slate-700">
                <span>{indicator.label}</span>
                <span className="text-xs font-medium text-slate-400">{indicator.weight}</span>
              </span>
              <input
                type="number"
                min="0"
                max="1000"
                step="1"
                inputMode="numeric"
                value={indicators[indicator.label] ?? ''}
                onChange={(event) => updateIndicator(indicator.label, event.target.value)}
                placeholder="—"
                aria-label={`مؤشر ${indicator.label}`}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-center text-slate-800 outline-none transition focus:border-[#1B2A4A] focus:ring-2 focus:ring-slate-200"
              />
            </label>
          ))}
        </div>

        {!hasCompleteIndicators(indicators) && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            لا يمكن تشغيل الحساب قبل توفر المؤشرات الستة كاملةً. لم تتم إضافة قيم تقديرية تلقائيًا.
          </div>
        )}

        {session.core_score_backend !== null && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
            <p className="text-sm text-emerald-800">
              ✓ آخر درجة محسوبة: <strong>{session.core_score_display ?? '—'}</strong>
              {session.patient_class ? ` (${session.patient_class})` : ''}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6">
        <h2 className="text-lg font-bold text-slate-800">قرار القبول (PAR)</h2>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {PAR_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSelectedPar(option.value)}
              className={`rounded-xl border p-3 text-sm font-semibold transition-colors ${selectedPar === option.value ? option.className : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'}`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <PermissionGuard required="edit_sessions">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#1B2A4A] py-3 text-sm font-bold text-white transition-colors hover:bg-[#223A63] disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'جاري الحفظ...' : 'حفظ قرار الجلسة'}
        </button>
      </PermissionGuard>
    </div>
  );
}
