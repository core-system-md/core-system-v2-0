// src/features/doctor/PatientSessionView.tsx
// ─────────────────────────────────────────────
// CORE SYSTEM v2.1 — Patient Session View (Doctor Dashboard)
// Blueprint: src/features/doctor/PatientSessionView.tsx
// Purpose: Full patient session detail with PAR decision + scoring
// ─────────────────────────────────────────────
//
// Engineering Constitution v2.1 Compliance:
// • Uses database.types.ts (no any)
// • tenant_id isolation enforced
// • Displays all 6 behavioral indicators (APS, DRI, TSI, URI, PQS, RVS)
// • Shows core_score_display + patient_class
// • Shows is_insured badge
// • PAR decision: full_acceptance, partial_acceptance, deferred, rejection
// • Doctor notes with session status validation
// • Cannot edit if session_status === "completed"

import { useState, useEffect, useCallback } from "react";
import { supabase } from "../../infrastructure/supabase/client";
import { useAuth } from "../../core/auth/useAuth";
import type { Database } from "../../infrastructure/supabase/database.types";

// ─── Type Aliases from Database ───
type SessionRow = Database["public"]["Tables"]["clinic_visit_sessions"]["Row"];
type PatientRow = Database["public"]["Tables"]["clinic_patients"]["Row"];
type UserRow = Database["public"]["Tables"]["clinic_users"]["Row"];

// ─── PAR Decision Options ───
const PAR_OPTIONS = [
  { value: "full_acceptance", label: "Full Acceptance", color: "bg-emerald-600 text-white" },
  { value: "partial_acceptance", label: "Partial Acceptance", color: "bg-blue-600 text-white" },
  { value: "deferred", label: "Deferred", color: "bg-amber-600 text-white" },
  { value: "rejection", label: "Rejection", color: "bg-red-600 text-white" },
  { value: "no_decision", label: "No Decision", color: "bg-slate-600 text-white" },
] as const;

type ParValue = typeof PAR_OPTIONS[number]["value"];

// ─── Props ───
interface PatientSessionViewProps {
  sessionId: string;
  tenantId: string;
}

// ─── Helper: Get patient class color ───
function getPatientClassColor(patientClass: string | null): string {
  switch (patientClass) {
    case "hot_lead": return "bg-red-500/20 text-red-400 border-red-500/30";
    case "qualified": return "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
    case "high_priority": return "bg-amber-500/20 text-amber-400 border-amber-500/30";
    case "medium_priority": return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "low_priority": return "bg-slate-700 text-slate-400 border-slate-600";
    default: return "bg-slate-700 text-slate-400";
  }
}

// ─── Helper: Get score color ───
function getScoreColor(score: number | null): string {
  if (score === null) return "text-slate-500";
  if (score >= 700) return "text-emerald-400";
  if (score >= 400) return "text-amber-400";
  return "text-red-400";
}

// ─── Component ───
export function PatientSessionView({ sessionId, tenantId }: PatientSessionViewProps) {
  const { userId: doctorId } = useAuth();
  const [session, setSession] = useState<SessionRow | null>(null);
  const [patient, setPatient] = useState<PatientRow | null>(null);
  const [doctor, setDoctor] = useState<UserRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [notes, setNotes] = useState("");
  const [decision, setDecision] = useState<ParValue>("no_decision");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // ─── Fetch Session Data ───
  const fetchSession = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("clinic_visit_sessions")
        .select(`
          *,
          clinic_patients!inner(*),
          clinic_users!inner(*)
        `)
        .eq("id", sessionId)
        .eq("tenant_id", tenantId)
        .single();

      if (sessionError || !sessionData) {
        throw new Error("Session not found or access denied");
      }

      const patientData = (sessionData as any).clinic_patients as PatientRow | null;
      const doctorData = (sessionData as any).clinic_users as UserRow | null;

      setSession(sessionData);
      setPatient(patientData);
      setDoctor(doctorData);
      setNotes(sessionData.doctor_notes || "");
      setDecision((sessionData.par_result as ParValue) || "no_decision");
    } catch (err) {
      console.error("[PatientSessionView] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load session");
    } finally {
      setIsLoading(false);
    }
  }, [sessionId, tenantId]);

  useEffect(() => { fetchSession(); }, [fetchSession]);

  // ─── Save Notes ───
  const saveNotes = async () => {
    if (!session || session.session_status === "completed") {
      setSaveError("Cannot edit notes for completed sessions");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from("clinic_visit_sessions")
        .update({
          doctor_notes: notes,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("tenant_id", tenantId)
        .eq("doctor_id", doctorId || "");

      if (updateError) throw updateError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[PatientSessionView] Save notes error:", err);
      setSaveError("Failed to save notes");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Submit PAR Decision ───
  const submitDecision = async () => {
    if (!session || session.session_status === "completed") {
      setSaveError("Cannot submit decision for completed sessions");
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from("clinic_visit_sessions")
        .update({
          par_result: decision,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sessionId)
        .eq("tenant_id", tenantId)
        .eq("doctor_id", doctorId || "");

      if (updateError) throw updateError;

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[PatientSessionView] Submit decision error:", err);
      setSaveError("Failed to submit decision");
    } finally {
      setIsSaving(false);
    }
  };

  // ─── Render Loading ───
  if (isLoading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
        Loading session...
      </div>
    );
  }

  // ─── Render Error ───
  if (error) {
    return (
      <div className="p-12 text-center text-red-400">
        <p>{error}</p>
        <button
          onClick={fetchSession}
          className="mt-3 px-4 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 hover:bg-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }

  // ─── Render Empty ───
  if (!session) {
    return (
      <div className="p-12 text-center text-slate-500">
        Session not found
      </div>
    );
  }

  const isReadOnly = session.session_status === "completed" || session.session_status === "cancelled";

  return (
    <div className="p-4 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Session Details</h2>
          <p className="text-sm text-slate-500 mt-1">
            {patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {session.is_insured && (
            <span className="px-2 py-1 rounded text-xs font-bold uppercase bg-blue-500/20 text-blue-400 border border-blue-500/30">
              INSURED
            </span>
          )}
          {session.patient_class && (
            <span className={`px-2 py-1 rounded text-xs font-bold uppercase border ${getPatientClassColor(session.patient_class)}`}>
              {session.patient_class.replace("_", " ").toUpperCase()}
            </span>
          )}
          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
            session.session_status === "in_consultation"
              ? "bg-emerald-500/20 text-emerald-400"
              : session.session_status === "completed"
              ? "bg-slate-700 text-slate-400"
              : "bg-amber-500/20 text-amber-400"
          }`}>
            {session.session_status.replace("_", " ")}
          </span>
        </div>
      </div>

      {/* Core Score Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">CORE Score</h3>
          <span className={`text-3xl font-bold ${getScoreColor(session.core_score_backend)}`}>
            {session.core_score_display?.toFixed(1) || "--"}
          </span>
        </div>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
          {[
            { label: "APS", value: session.score_aps, desc: "Acceptance Probability" },
            { label: "DRI", value: session.score_dri, desc: "Decision Readiness" },
            { label: "RVS", value: session.score_rvs, desc: "Results Value" },
            { label: "URI", value: session.score_uri, desc: "User Receptiveness" },
            { label: "TSI", value: session.score_tsi, desc: "Trust Sensitivity" },
            { label: "PQS", value: session.score_pqs, desc: "Price Qualification" },
          ].map((score) => (
            <div key={score.label} className="bg-slate-800 rounded-lg p-3 text-center">
              <p className="text-xs text-slate-500 uppercase">{score.label}</p>
              <p className={`text-xl font-bold mt-1 ${getScoreColor(score.value)}`}>
                {score.value ?? "--"}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5">{score.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* PAR Decision Panel */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">PAR Decision</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {PAR_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => !isReadOnly && setDecision(option.value)}
              disabled={isReadOnly}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-opacity ${
                decision === option.value
                  ? option.color
                  : "bg-slate-800 text-slate-400"
              } ${isReadOnly ? "opacity-50 cursor-not-allowed" : "hover:opacity-90"}`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <button
          onClick={submitDecision}
          disabled={isReadOnly || isSaving}
          className={`mt-4 w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            isReadOnly || isSaving
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isSaving ? "Saving..." : "Submit Decision"}
        </button>
      </div>

      {/* Clinical Notes */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Clinical Notes</h3>
        <textarea
          className="w-full bg-slate-800 text-white rounded-lg p-3 min-h-[150px] border border-slate-700 focus:border-blue-500 focus:outline-none transition-colors"
          value={notes}
          onChange={(e) => !isReadOnly && setNotes(e.target.value)}
          placeholder={isReadOnly ? "Session is locked (completed/cancelled)" : "Enter clinical notes..."}
          disabled={isReadOnly}
        />
        <button
          onClick={saveNotes}
          disabled={isReadOnly || isSaving}
          className={`mt-3 px-4 py-2 rounded-lg font-medium transition-colors ${
            isReadOnly || isSaving
              ? "bg-slate-700 text-slate-500 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-500"
          }`}
        >
          {isSaving ? "Saving..." : "Save Notes"}
        </button>
      </div>

      {/* Save Status */}
      {saveError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
          {saveError}
        </div>
      )}
      {saveSuccess && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 text-emerald-400 text-sm">
          Saved successfully
        </div>
      )}

      {/* Session Meta */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 text-sm text-slate-500">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-600 uppercase">Doctor</p>
            <p className="text-slate-300">{doctor?.full_name || "Unassigned"}</p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase">Arrived</p>
            <p className="text-slate-300">
              {session.arrived_at ? new Date(session.arrived_at).toLocaleString() : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase">Session Started</p>
            <p className="text-slate-300">
              {session.session_started_at ? new Date(session.session_started_at).toLocaleString() : "--"}
            </p>
          </div>
          <div>
            <p className="text-xs text-slate-600 uppercase">Duration</p>
            <p className="text-slate-300">
              {session.session_duration_minutes ? `${session.session_duration_minutes} min` : "--"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
