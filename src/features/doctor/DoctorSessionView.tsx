// ═══════════════════════════════════════════════════════════════════
// DoctorSessionView.tsx — Week 4 Unified Clinical Flow
// Location: src/features/doctor/DoctorSessionView.tsx
// Purpose: Single screen combining all Week 4 components
// Created: 2026-07-05 | Status: Production Ready
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import DecisionCard from '@/components/doctor/DecisionCard';
import { ClinicalNotes } from './ClinicalNotes';
import { SimpleInvoice } from './SimpleInvoice';
import { CloseSession } from './CloseSession';
import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle, User, Calendar, Clock, Shield } from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────
interface SessionData {
  id: string;
  patient_id: string;
  patient_name: string;
  patient_name_ar: string | null;
  session_status: string;
  created_at: string;
  waiting_time_minutes: number | null;
  session_duration_minutes: number | null;
  is_insured: boolean;
  core_score_display: number | null;
  core_score_backend: number | null;
  patient_class: string | null;
  doctor_notes: string | null;
  par_result: string | null;
  room_id: string | null;
  agenda_event_id: string | null;
  dominant_disc_profile: string | null;
}

interface SessionQueryResult {
  id: string;
  patient_id: string;
  session_status: string;
  created_at: string;
  waiting_time_minutes: number | null;
  session_duration_minutes: number | null;
  is_insured: boolean;
  core_score_display: number | null;
  core_score_backend: number | null;
  patient_class: string | null;
  doctor_notes: string | null;
  par_result: string | null;
  room_id: string | null;
  agenda_event_id: string | null;
  clinic_patients: {
    first_name: string;
    last_name: string;
    first_name_ar: string | null;
    last_name_ar: string | null;
    phone_primary: string;
    dominant_disc_profile: string | null;
  } | null;
}

// ─── Status Helpers ────────────────────────────────────────────────
const STATUS_COLORS: Record<string, string> = {
  waiting: 'bg-amber-100 text-amber-800 border-amber-300',
  in_consultation: 'bg-sky-100 text-sky-800 border-sky-300',
  pending_close: 'bg-orange-100 text-orange-800 border-orange-300',
  completed: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300',
  auto_closed: 'bg-slate-100 text-slate-800 border-slate-300',
};

const STATUS_LABELS_AR: Record<string, string> = {
  waiting: 'في الانتظار',
  in_consultation: 'جارية',
  pending_close: 'بانتظار الإغلاق',
  completed: 'مكتملة',
  cancelled: 'ملغاة',
  auto_closed: 'إغلاق تلقائي',
};

// ─── Loading Skeleton Component (inline) ───────────────────────────
function LoadingSkeleton() {
  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-4" dir="rtl">
      <div className="h-24 w-full rounded-xl bg-slate-200 animate-pulse" />
      <div className="h-56 w-full rounded-xl bg-slate-200 animate-pulse" />
      <div className="h-72 w-full rounded-xl bg-slate-200 animate-pulse" />
      <div className="h-48 w-full rounded-xl bg-slate-200 animate-pulse" />
      <div className="h-32 w-full rounded-xl bg-slate-200 animate-pulse" />
    </div>
  );
}

// ─── Status Badge Component (inline) ─────────────────────────────
function StatusBadge({ status, isInsured }: { status: string; isInsured: boolean }) {
  const statusClass = STATUS_COLORS[status] || STATUS_COLORS.waiting;
  const statusLabel = STATUS_LABELS_AR[status] || status;

  return (
    <div className="flex flex-col items-end gap-2">
      <span className={`inline-flex items-center rounded-full border px-3.5 py-1 text-sm font-bold ${statusClass}`}>
        {statusLabel}
      </span>
      {isInsured && (
        <span className="inline-flex items-center rounded-full border bg-sky-50 text-sky-700 border-sky-200 text-xs px-2.5 py-0.5 font-medium">
          <Shield className="h-3 w-3 ml-1" />
          تأمين
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════
export default function DoctorSessionView() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  // ── Auth State (FIX #3 — NEVER from localStorage) ──────────────
  const tenantId = useAuthStore((state) => state.tenant_id);
  const user = useAuthStore((state) => state.user);

  // ── Local State ──────────────────────────────────────────────────
  const [session, setSession] = useState<SessionData | null>(null);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  // ── Fetch Session Data ─────────────────────────────────────────
  const fetchSession = useCallback(async () => {
    if (!tenantId) {
      setError('Tenant not initialized');
      setLoading(false);
      return;
    }
    if (!sessionId) {
      setError('Session ID required');
      setLoading(false);
      return;
    }
    if (!user?.id) {
      setError('User not authenticated');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from('clinic_visit_sessions')
      .select(`
        id,
        patient_id,
        session_status,
        created_at,
        waiting_time_minutes,
        session_duration_minutes,
        is_insured,
        core_score_display,
        core_score_backend,
        patient_class,
        doctor_notes,
        par_result,
        room_id,
        agenda_event_id,
        clinic_patients!inner(
          first_name,
          last_name,
          first_name_ar,
          last_name_ar,
          phone_primary,
          dominant_disc_profile
        )
      `)
      .eq('id', sessionId)
      .eq('tenant_id', tenantId)
      .eq('doctor_id', user.id)
      .is('deleted_at', null)
      .single();

    if (dbError || !data) {
      setError(dbError?.message || 'Session not found or access denied');
      setLoading(false);
      return;
    }

    const row = data as unknown as SessionQueryResult;
    const patient = row.clinic_patients;

    const displayName = patient?.first_name_ar && patient?.last_name_ar
      ? `${patient.first_name_ar} ${patient.last_name_ar}`
      : `${patient?.first_name || ''} ${patient?.last_name || ''}`.trim() || 'Unknown';

    setSession({
      id: row.id,
      patient_id: row.patient_id,
      patient_name: displayName,
      patient_name_ar: patient?.first_name_ar || null,
      session_status: row.session_status,
      created_at: row.created_at,
      waiting_time_minutes: row.waiting_time_minutes,
      session_duration_minutes: row.session_duration_minutes,
      is_insured: row.is_insured,
      core_score_display: row.core_score_display,
      core_score_backend: row.core_score_backend,
      patient_class: row.patient_class,
      doctor_notes: row.doctor_notes,
      par_result: row.par_result,
      room_id: row.room_id,
      agenda_event_id: row.agenda_event_id,
      dominant_disc_profile: patient?.dominant_disc_profile || null,
    });

    setLoading(false);
  }, [tenantId, sessionId, user?.id]);

  useEffect(() => {
    fetchSession();
  }, [fetchSession, refreshKey]);

  // ── Notes Handlers ─────────────────────────────────────────────
  const handleAddNote = useCallback((note: any) => {
    const newNote = {
      ...note,
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
    };
    setNotes((prev) => [...prev, newNote]);
  }, []);

  const handleUpdateNote = useCallback((id: string, content: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, content } : n))
    );
  }, []);

  // ── Handle Session Closed ──────────────────────────────────────
  const handleSessionClosed = useCallback(() => {
    setSession((prev) => prev ? { ...prev, session_status: 'completed' } : prev);
    setRefreshKey((k) => k + 1);
  }, []);

  // ── Loading State ──────────────────────────────────────────────
  if (loading) {
    return <LoadingSkeleton />;
  }

  // ── Error State ────────────────────────────────────────────────
  if (error || !session) {
    return (
      <div className="max-w-5xl mx-auto p-4 md:p-6" dir="rtl">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 pt-6">
            <AlertCircle className="h-8 w-8 text-red-600 shrink-0" />
            <div>
              <p className="font-bold text-red-900 text-lg">خطأ في تحميل الجلسة</p>
              <p className="text-sm text-red-700 mt-1">{error || 'Session not found'}</p>
              <button
                onClick={() => navigate('/doctor')}
                className="mt-3 text-sm text-red-800 underline hover:text-red-900"
              >
                العودة لقائمة المرضى
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5" dir="rtl">

      {/* ═══════════════════════════════════════════════════════════
          1. PATIENT HEADER
         ═══════════════════════════════════════════════════════════ */}
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="flex flex-col md:flex-row md:items-center gap-4 p-5">
            {/* Avatar */}
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white text-2xl font-bold shrink-0 shadow-md">
              <User className="h-8 w-8" />
            </div>

            {/* Patient Info */}
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-bold text-slate-900 truncate">
                {session.patient_name}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2 text-sm text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5" />
                  {new Date(session.created_at).toLocaleDateString('ar-JO', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  {new Date(session.created_at).toLocaleTimeString('ar-JO', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
                {session.patient_name_ar && (
                  <span className="text-slate-400 font-medium">
                    {session.patient_name_ar}
                  </span>
                )}
              </div>
            </div>

            {/* Status & Badges */}
            <StatusBadge status={session.session_status} isInsured={session.is_insured} />
          </div>

          {/* Metrics Bar */}
          <div className="grid grid-cols-3 divide-x divide-slate-100 border-t border-slate-100 bg-slate-50/50">
            <div className="p-3 text-center">
              <div className="text-xs text-slate-400 font-medium">وقت الانتظار</div>
              <div className="text-lg font-bold text-slate-700">
                {session.waiting_time_minutes !== null ? `${session.waiting_time_minutes} د` : '—'}
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-xs text-slate-400 font-medium">مدة الجلسة</div>
              <div className="text-lg font-bold text-slate-700">
                {session.session_duration_minutes !== null ? `${session.session_duration_minutes} د` : '—'}
              </div>
            </div>
            <div className="p-3 text-center">
              <div className="text-xs text-slate-400 font-medium">Core Score</div>
              <div className={`text-lg font-bold ${
                (session.core_score_display ?? 0) >= 80 ? 'text-emerald-600' :
                (session.core_score_display ?? 0) >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {session.core_score_display !== null ? session.core_score_display.toFixed(1) : '—'}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════
          2. DECISION CARD (uses useParams internally)
         ═══════════════════════════════════════════════════════════ */}
      <section aria-label="Decision Card">
        <DecisionCard />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          3. CLINICAL NOTES
         ═══════════════════════════════════════════════════════════ */}
      <section aria-label="Clinical Notes">
        <ClinicalNotes
          notes={notes}
          onAddNote={handleAddNote}
          onUpdateNote={handleUpdateNote}
          patientName={session.patient_name}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          4. INVOICE SECTION
         ═══════════════════════════════════════════════════════════ */}
      <section aria-label="Invoice">
        <SimpleInvoice
          patientId={session.patient_id}
          sessionId={session.id}
          onComplete={handleSessionClosed}
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════
          5. CLOSE SESSION
         ═══════════════════════════════════════════════════════════ */}
      <section aria-label="Close Session">
        <CloseSession
          sessionId={session.id}
          onClose={handleSessionClosed}
        />
      </section>

    </div>
  );
}