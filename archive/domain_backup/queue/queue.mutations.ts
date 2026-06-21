// ============================================================
// src/domain/queue/queue.mutations.ts
// CORE SYSTEM v2.1 — Queue Mutations (Reorder, Hot-Swap, Status)
// Blueprint Compliant: Section 9 (Sessions) + Lock Governance
// ============================================================

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { queueKeys } from "./queue.queries";
import type { 
  ReorderPayload, 
  HotSwapPayload, 
  LockAcquirePayload, 
  LockReleasePayload
} from "./queue.types";

// Mutation: Reorder Queue Cards
export function useReorderQueue(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ReorderPayload) => {
      const { error } = await supabase
        .from("clinic_visit_sessions")
        .update({ 
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.sessionId)
        .eq("tenant_id", tenantId);

      if (error) throw new Error(`Reorder failed: ${error.message}`);
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists(tenantId) });
    },
  });
}

// Mutation: Hot-Swap (Doctor/Room/Time swap)
export function useHotSwap(tenantId: string) {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  return useMutation({
    mutationFn: async (payload: HotSwapPayload) => {
      if (!role || !["receptionist", "clinic_admin"].includes(role)) {
        throw new Error("UNAUTHORIZED: Hot-swap requires receptionist or clinic_admin role");
      }

      const updates: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (payload.swapType === "doctor") {
        updates.doctor_id = payload.targetSessionId;
      } else if (payload.swapType === "room") {
        updates.room_id = payload.targetSessionId;
      }

      const { error } = await supabase
        .from("clinic_visit_sessions")
        .update(updates)
        .eq("id", payload.sourceSessionId)
        .eq("tenant_id", tenantId);

      if (error) throw new Error(`Hot-swap failed: ${error.message}`);
      return payload;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists(tenantId) });
    },
  });
}

// Mutation: Acquire Session Lock
export function useAcquireLock(tenantId: string) {
  const queryClient = useQueryClient();
  const { userId } = useAuth();

  return useMutation({
    mutationFn: async (payload: LockAcquirePayload): Promise<any> => {
      if (!userId) {
        return { success: false, error: "UNAUTHORIZED" };
      }

      const { data: existing } = await supabase
        .from("clinic_visit_sessions")
        .select("lock_holder_id, lock_timestamp")
        .eq("id", payload.sessionId)
        .eq("tenant_id", tenantId)
        .single();

      if (existing?.lock_holder_id && existing.lock_holder_id !== payload.staffId) {
        return { 
          success: false, 
          error: "ALREADY_LOCKED", 
          lockedBy: existing.lock_holder_id 
        };
      }

      if (existing?.lock_holder_id === payload.staffId) {
        const { error } = await supabase
          .from("clinic_visit_sessions")
          .update({ 
            lock_timestamp: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", payload.sessionId)
          .eq("tenant_id", tenantId);

        if (error) throw error;
        return { success: true, lockTimestamp: new Date().toISOString() };
      }

      const { error } = await supabase
        .from("clinic_visit_sessions")
        .update({ 
          lock_holder_id: payload.staffId,
          lock_timestamp: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.sessionId)
        .eq("tenant_id", tenantId)
        .is("lock_holder_id", null);

      if (error) {
        const { data: raceCheck } = await supabase
          .from("clinic_visit_sessions")
          .select("lock_holder_id")
          .eq("id", payload.sessionId)
          .single();
        
        if (raceCheck?.lock_holder_id && raceCheck.lock_holder_id !== payload.staffId) {
          return { 
            success: false, 
            error: "ALREADY_LOCKED", 
            lockedBy: raceCheck.lock_holder_id 
          };
        }
        throw new Error(`Lock acquire failed: ${error.message}`);
      }

      return { success: true, lockTimestamp: new Date().toISOString() };
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queueKeys.lists(tenantId) });
      }
    },
  });
}

// Mutation: Release Session Lock
export function useReleaseLock(tenantId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: LockReleasePayload): Promise<any> => {
      const { data: session } = await supabase
        .from("clinic_visit_sessions")
        .select("lock_holder_id, session_status")
        .eq("id", payload.sessionId)
        .eq("tenant_id", tenantId)
        .single();

      if (!session) {
        return { success: false, error: "SESSION_CLOSED" };
      }

      if (session.lock_holder_id !== payload.staffId && !payload.force) {
        return { success: false, error: "UNAUTHORIZED" };
      }

      if (session.session_status === "completed" || session.session_status === "cancelled") {
        return { success: false, error: "SESSION_CLOSED" };
      }

      const { error } = await supabase
        .from("clinic_visit_sessions")
        .update({ 
          lock_holder_id: null,
          lock_timestamp: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payload.sessionId)
        .eq("tenant_id", tenantId);

      if (error) throw new Error(`Lock release failed: ${error.message}`);
      return { success: true, lockTimestamp: new Date().toISOString() };
    },
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: queueKeys.lists(tenantId) });
      }
    },
  });
}

// Mutation: Transition Session Status
export function useSessionStatusTransition(tenantId: string) {
  const queryClient = useQueryClient();
  const { role } = useAuth();

  return useMutation({
    mutationFn: async ({ 
      sessionId, 
      newStatus, 
      notes 
    }: { 
      sessionId: string; 
      newStatus: string; 
      notes?: string;
    }) => {
      if (!role) throw new Error("UNAUTHORIZED");

      const allowedTransitions: Record<string, string[]> = {
        receptionist: ["waiting", "in_consultation", "cancelled"],
        doctor: ["in_consultation", "pending_close", "completed"],
        clinic_admin: ["waiting", "in_consultation", "pending_close", "completed", "cancelled", "auto_closed"],
      };

      if (!allowedTransitions[role]?.includes(newStatus)) {
        throw new Error(`FORBIDDEN: Role ${role} cannot set status to ${newStatus}`);
      }

      const updates: Record<string, any> = {
        session_status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === "in_consultation") {
        updates.session_started_at = new Date().toISOString();
      } else if (newStatus === "pending_close") {
        updates.session_ended_at = new Date().toISOString();
      } else if (newStatus === "completed") {
        updates.visit_closed_at = new Date().toISOString();
      }

      if (notes) {
        updates.doctor_notes = notes;
      }

      const { error } = await supabase
        .from("clinic_visit_sessions")
        .update(updates)
        .eq("id", sessionId)
        .eq("tenant_id", tenantId);

      if (error) throw new Error(`Status transition failed: ${error.message}`);
      return { sessionId, newStatus };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists(tenantId) });
    },
  });
}