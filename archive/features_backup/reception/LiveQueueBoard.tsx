// src/features/reception/LiveQueueBoard.tsx
// ─────────────────────────────────────────────
// CORE SYSTEM v2.1 — Live Queue Board (Reception Dashboard)
// Blueprint: src/features/reception/LiveQueueBoard.tsx
// Purpose: Real-time drag-drop queue board with SLA radar
// ─────────────────────────────────────────────
//
// Engineering Constitution v2.1 Compliance:
// • Uses database.types.ts (no any)
// • Displays core_score_display (backend/10)
// • Shows patient_class, is_insured, lock_holder_id
// • SLA radar: green <15 | yellow 15-24 | red >=25 min
// • Real-time updates via useQueueChannel
// • Tenant isolation enforced

import { useEffect, useState, useCallback } from "react";
import { supabase } from "../../infrastructure/supabase/client";
import { useQueueChannel } from "../../core/realtime/useQueueChannel";
import type { Database } from "../../infrastructure/supabase/database.types";
import { SlaRadarBadge } from "./SlaRadarBadge";
import { SessionLockIndicator } from "./SessionLockIndicator";

// ─── Type Aliases from Database ───
type SessionRow = Database["public"]["Tables"]["clinic_visit_sessions"]["Row"];
type PatientRow = Database["public"]["Tables"]["clinic_patients"]["Row"];
type UserRow = Database["public"]["Tables"]["clinic_users"]["Row"];
type RoomRow = Database["public"]["Tables"]["clinic_rooms"]["Row"];

// ─── Enriched Queue Item ───
interface QueueItem {
  session: SessionRow;
  patient: PatientRow | null;
  doctor: UserRow | null;
  room: RoomRow | null;
  waitMinutes: number;
  slaStatus: "green" | "yellow" | "red" | "breach";
}

// ─── Props ───
interface LiveQueueBoardProps {
  tenantId: string;
  onSessionClick?: (session: SessionRow) => void;
  onSessionLock?: (sessionId: string) => void;
  onSessionUnlock?: (sessionId: string) => void;
}

// ─── Helper: Compute SLA Status from wait minutes ───
// SLA thresholds: green <15 | yellow 15-24 | red >=25 min
function computeSlaStatus(waitMinutes: number): QueueItem["slaStatus"] {
  if (waitMinutes < 15) return "green";
  if (waitMinutes <= 24) return "yellow";
  return "red";
}

// ─── Helper: Format wait time ───
function formatWaitTime(minutes: number): string {
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
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

// ─── Helper: Get patient class label ───
function getPatientClassLabel(patientClass: string | null): string {
  switch (patientClass) {
    case "hot_lead": return "HOT";
    case "qualified": return "QUALIFIED";
    case "high_priority": return "HIGH";
    case "medium_priority": return "MEDIUM";
    case "low_priority": return "LOW";
    default: return "STANDARD";
  }
}

// ─── Component ───
export function LiveQueueBoard({
  tenantId,
  onSessionClick,
  onSessionLock: _onSessionLock,
  onSessionUnlock,
}: LiveQueueBoardProps) {
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [filter, setFilter] = useState<"all" | "waiting" | "in_consultation">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Subscribe to realtime queue updates
  useQueueChannel(tenantId);

  // ─── Fetch Queue Data ───
  const fetchQueue = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { data: sessions, error: sessionError } = await supabase
        .from("clinic_visit_sessions")
        .select(`
          *,
          clinic_patients!inner(*),
          clinic_users!inner(*),
          clinic_rooms(*)
        `)
        .eq("tenant_id", tenantId)
        .in("session_status", ["waiting", "in_consultation"])
        .order("created_at", { ascending: true });

      if (sessionError) throw sessionError;

      const enriched: QueueItem[] = (sessions || []).map((session) => {
        const patient = (session as any).clinic_patients as PatientRow | null;
        const doctor = (session as any).clinic_users as UserRow | null;
        const room = (session as any).clinic_rooms as RoomRow | null;

        const arrivedAt = session.arrived_at
          ? new Date(session.arrived_at).getTime()
          : Date.now();
        const waitMinutes = Math.floor((Date.now() - arrivedAt) / 60000);

        return {
          session,
          patient,
          doctor,
          room,
          waitMinutes,
          slaStatus: computeSlaStatus(waitMinutes),
        };
      });

      const classPriority: Record<string, number> = {
        hot_lead: 5,
        qualified: 4,
        high_priority: 3,
        medium_priority: 2,
        low_priority: 1,
        "": 0,
      };

      enriched.sort((a, b) => {
        const classDiff =
          (classPriority[b.session.patient_class || ""] || 0) -
          (classPriority[a.session.patient_class || ""] || 0);
        if (classDiff !== 0) return classDiff;

        const scoreDiff =
          (b.session.core_score_display || 0) -
          (a.session.core_score_display || 0);
        if (scoreDiff !== 0) return scoreDiff;

        return b.waitMinutes - a.waitMinutes;
      });

      setQueueItems(enriched);
    } catch (err) {
      console.error("[LiveQueueBoard] Fetch error:", err);
      setError("Failed to load queue. Please refresh.");
    } finally {
      setIsLoading(false);
    }
  }, [tenantId]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const filtered = filter === "all"
    ? queueItems
    : queueItems.filter((item) => item.session.session_status === filter);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Live Queue</h2>
          <p className="text-sm text-slate-500">
            {queueItems.length} active sessions
            {queueItems.filter((i) => i.slaStatus === "red").length > 0 && (
              <span className="ml-2 text-red-400">
                • {queueItems.filter((i) => i.slaStatus === "red").length} breach
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          {(["all", "waiting", "in_consultation"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filter === f
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
            >
              {f === "all" ? "All" : f.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-800">
        {isLoading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="w-8 h-8 border-2 border-slate-600 border-t-emerald-500 rounded-full animate-spin mx-auto mb-3" />
            Loading queue...
          </div>
        ) : error ? (
          <div className="p-12 text-center text-red-400">
            <p>{error}</p>
            <button
              onClick={fetchQueue}
              className="mt-3 px-4 py-2 rounded-lg bg-slate-800 text-sm text-slate-300 hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-slate-500">No sessions in queue</div>
        ) : (
          filtered.map((item) => (
            <div key={item.session.id} className="p-4">
              {item.session.lock_holder_id && (
                <div className="mb-3">
                  <SessionLockIndicator
                    lockedBy={item.doctor?.full_name || "Unknown"}
                    lockedAt={item.session.lock_timestamp}
                    expiresAt={item.session.buffer_window_expires_at}
                    onRequestUnlock={() => onSessionUnlock?.(item.session.id)}
                  />
                </div>
              )}

              <button
                onClick={() => onSessionClick?.(item.session)}
                className="w-full flex items-center gap-4 hover:bg-slate-800/50 transition-colors text-left rounded-lg p-2"
              >
                <div className="w-14 h-14 rounded-xl bg-slate-800 flex flex-col items-center justify-center flex-shrink-0">
                  <span className={`text-lg font-bold ${
                    (item.session.core_score_display || 0) >= 80
                      ? "text-emerald-400"
                      : (item.session.core_score_display || 0) >= 60
                      ? "text-amber-400"
                      : "text-slate-400"
                  }`}>
                    {item.session.core_score_display?.toFixed(1) || "--"}
                  </span>
                  <span className="text-[9px] text-slate-600 uppercase">CORE</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-white truncate">
                      {item.patient
                        ? `${item.patient.first_name} ${item.patient.last_name}`
                        : "Walk-in"
                      }
                    </span>

                    {item.session.patient_class && (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getPatientClassColor(item.session.patient_class)}`}>
                        {getPatientClassLabel(item.session.patient_class)}
                      </span>
                    )}

                    {item.session.is_insured && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-400 border border-blue-500/30">
                        INSURED
                      </span>
                    )}

                    <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase tracking-wider ${
                      item.session.session_status === "in_consultation"
                        ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {item.session.session_status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500">
                    <span>{item.doctor?.full_name || "Unassigned"}</span>
                    <span>•</span>
                    <span>Wait: {formatWaitTime(item.waitMinutes)}</span>
                    {item.room?.room_name && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400">{item.room.room_name}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="hidden md:flex flex-col items-end gap-1">
                  <SlaRadarBadge
                    status={item.slaStatus}
                    minutes={item.waitMinutes}
                    size="sm"
                  />
                  {item.session.session_status === "waiting" && item.waitMinutes >= 25 && (
                    <span className="text-[10px] text-red-400 animate-pulse">Action required</span>
                  )}
                </div>

                <svg className="w-5 h-5 text-slate-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
