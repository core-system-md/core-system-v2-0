// ============================================================
// src/domain/queue/queue.queries.ts
// CORE SYSTEM v2.1 — React Query hooks for Live Queue
// Blueprint Compliant: Section 9 (Sessions) + Realtime Channels
// TEMP: Using any for return types until database.types.ts is regenerated
// ============================================================

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/infrastructure/supabase/client";
import { useTenantStore } from "@/shared/store/tenantStore";
import type { QueueCard, QueueQueryParams, SlaMetrics } from "./queue.types";

// Query Keys
export const queueKeys = {
  all: ["queue"] as const,
  lists: (tenantId: string, date?: string) => 
    [...queueKeys.all, "list", tenantId, date || "today"] as const,
  card: (sessionId: string) => 
    [...queueKeys.all, "card", sessionId] as const,
  sla: (sessionId: string) => 
    [...queueKeys.all, "sla", sessionId] as const,
};

// Fetch full queue board
async function fetchQueueBoard(params: QueueQueryParams) {
  const { tenantId, date } = params;
  const targetDate = date || new Date().toISOString().split("T")[0];
  
  const { data, error } = await supabase
    .from("clinic_visit_sessions")
    .select(`
      id,
      patient_id,
      doctor_id,
      room_id,
      agenda_event_id,
      arrived_at,
      session_started_at,
      waiting_time_minutes,
      core_score_display,
      patient_class,
      lock_holder_id,
      lock_timestamp,
      is_insured,
      session_status,
      created_at,
      clinic_patients!inner(id, first_name, last_name, phone_primary),
      clinic_users!inner(id, full_name, specialization),
      master_agenda_events!left(id, scheduled_start, visit_type),
      clinic_rooms!left(id, room_name)
    `)
    .eq("tenant_id", tenantId)
    .gte("created_at", `${targetDate}T00:00:00Z`)
    .lte("created_at", `${targetDate}T23:59:59Z`)
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Queue fetch failed: ${error.message}`);

  const cards: QueueCard[] = (data || []).map((row: any, index: number) => ({
    sessionId: row.id,
    patientId: row.patient_id,
    patientName: `${row.clinic_patients.first_name} ${row.clinic_patients.last_name}`,
    patientPhone: row.clinic_patients.phone_primary,
    doctorId: row.doctor_id,
    doctorName: row.clinic_users.full_name,
    roomId: row.room_id,
    roomName: row.clinic_rooms?.room_name || null,
    sessionStatus: row.session_status,
    arrivedAt: row.arrived_at,
    sessionStartedAt: row.session_started_at,
    waitingTimeMinutes: row.waiting_time_minutes,
    coreScoreDisplay: row.core_score_display ? parseFloat(row.core_score_display) : null,
    patientClass: row.patient_class || "low_priority",
    lockHolderId: row.lock_holder_id,
    lockHolderName: null,
    lockTimestamp: row.lock_timestamp,
    isLocked: !!row.lock_holder_id,
    isInsured: row.is_insured,
    agendaEventId: row.agenda_event_id,
    scheduledStart: row.master_agenda_events?.scheduled_start || null,
    visitType: row.master_agenda_events?.visit_type || null,
    sortOrder: index,
    createdAt: row.created_at,
  }));

  return {
    tenantId,
    cards,
    activeDoctors: [],
    lastUpdated: new Date().toISOString(),
  };
}

// Hook: useQueueBoard
export function useQueueBoard(params: QueueQueryParams) {
  return useQuery({
    queryKey: queueKeys.lists(params.tenantId, params.date),
    queryFn: () => fetchQueueBoard(params),
    staleTime: 5000,
    refetchInterval: 10000,
    enabled: !!params.tenantId,
  });
}

// Hook: useQueueRealtime
export function useQueueRealtime(tenantId: string) {
  const queryClient = useQueryClient();
  const currentTenant = useTenantStore((s) => s.tenantId);

  useEffect(() => {
    if (!tenantId || tenantId !== currentTenant) return;

    const channel = supabase
      .channel(`queue:${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "clinic_visit_sessions",
          filter: `tenant_id=eq.${tenantId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: queueKeys.lists(tenantId),
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenantId, currentTenant, queryClient]);
}

// Hook: useSlaMetrics
export function useSlaMetrics(sessionId: string, waitTimeMinutes: number | null) {
  return useQuery({
    queryKey: queueKeys.sla(sessionId),
    queryFn: async () => {
      const { data: rule } = await supabase
        .from("core_rules_config")
        .select("rule_value")
        .eq("rule_category", "sla")
        .eq("rule_key", "wait_times")
        .single();

      const thresholds = (rule?.rule_value as any) || {
        green_max_minutes: 14,
        yellow_max_minutes: 24,
        red_min_minutes: 25,
      };

      const status: SlaMetrics["status"] = 
        !waitTimeMinutes || waitTimeMinutes <= thresholds.green_max_minutes ? "green" :
        waitTimeMinutes <= thresholds.yellow_max_minutes ? "yellow" : "red";

      return {
        sessionId,
        waitTimeMinutes: waitTimeMinutes || 0,
        status,
        thresholdMinutes: {
          green: thresholds.green_max_minutes,
          yellow: thresholds.yellow_max_minutes,
          red: thresholds.red_min_minutes,
        },
      };
    },
    enabled: !!sessionId,
  });
}

// Hook: useActiveDoctors
export function useActiveDoctors(tenantId: string) {
  return useQuery({
    queryKey: ["doctors", "active", tenantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clinic_users")
        .select("id, full_name, specialization, room_id, clinic_rooms!left(room_name)")
        .eq("tenant_id", tenantId)
        .eq("role", "doctor")
        .eq("is_active", true);

      if (error) throw error;
      return data || [];
    },
    enabled: !!tenantId,
  });
}