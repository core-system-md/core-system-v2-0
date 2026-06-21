// ============================================================
// src/domain/queue/queue.locks.ts
// CORE SYSTEM v2.1 — Lock Governance & Abandonment Protocol
// Blueprint Compliant: Section 9 (lock governance) + core_rules_config SLA
// ============================================================

import { useEffect, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/infrastructure/supabase/client";
import { useAuth } from "@/core/auth/useAuth";
import { queueKeys } from "./queue.queries";
import type { QueueCard } from "./queue.types";

// Constants from Blueprint core_rules_config
const SOFT_WARN_MINUTES = 5;
const HARD_RELEASE_MINUTES = 10;
const LOCK_POLL_INTERVAL = 30000;

// Hook: useLockGovernance — Auto-abandonment + warnings
export function useLockGovernance(tenantId: string) {
  const queryClient = useQueryClient();

  const checkAbandonedLocks = useCallback(async () => {
    if (!tenantId) return;

    const now = new Date().toISOString();
    
    const { data: abandoned, error } = await supabase
      .from("clinic_visit_sessions")
      .select("id, lock_holder_id, session_status")
      .eq("tenant_id", tenantId)
      .not("lock_holder_id", "is", null)
      .lt("lock_timestamp", new Date(Date.now() - HARD_RELEASE_MINUTES * 60000).toISOString())
      .not("session_status", "in", "(completed,cancelled)");

    if (error || !abandoned?.length) return;

    for (const session of abandoned) {
      await supabase
        .from("clinic_visit_sessions")
        .update({
          lock_holder_id: null,
          lock_timestamp: null,
          updated_at: now,
        })
        .eq("id", session.id)
        .eq("tenant_id", tenantId);

      await supabase.from("system_delivery_breaches").insert({
        tenant_id: tenantId,
        breach_type: "Operational_Negligence_Lock_Abandonment",
        severity: "warning",
        related_session_id: session.id,
        related_user_id: session.lock_holder_id,
        breach_details: {
          lock_duration_minutes: HARD_RELEASE_MINUTES,
          released_at: now,
          auto_released: true,
        },
      });
    }

    if (abandoned.length > 0) {
      queryClient.invalidateQueries({ queryKey: queueKeys.lists(tenantId) });
    }
  }, [tenantId, queryClient]);

  useEffect(() => {
    checkAbandonedLocks();
    const interval = setInterval(checkAbandonedLocks, LOCK_POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [checkAbandonedLocks]);

  return { checkAbandonedLocks };
}

// Hook: useLockWarning — Warn user if lock is about to expire
export function useLockWarning(card: QueueCard | null) {
  const { userId } = useAuth();
  const [warning, setWarning] = useState<any>("none");

  useEffect(() => {
    if (!card?.isLocked || !card.lockTimestamp || card.lockHolderId !== userId) {
      setWarning("none");
      return;
    }

    const lockTime = new Date(card.lockTimestamp).getTime();
    const now = Date.now();
    const elapsedMinutes = (now - lockTime) / 60000;

    if (elapsedMinutes >= HARD_RELEASE_MINUTES) {
      setWarning("hard");
    } else if (elapsedMinutes >= SOFT_WARN_MINUTES) {
      setWarning("soft");
    } else {
      setWarning("none");
    }

    const interval = setInterval(() => {
      const currentElapsed = (Date.now() - lockTime) / 60000;
      if (currentElapsed >= HARD_RELEASE_MINUTES) {
        setWarning("hard");
      } else if (currentElapsed >= SOFT_WARN_MINUTES) {
        setWarning("soft");
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [card, userId]);

  return warning;
}

// Utility: isLockValid — Check if a lock is still held
export function isLockValid(card: QueueCard): boolean {
  if (!card.isLocked || !card.lockTimestamp) return false;
  const lockTime = new Date(card.lockTimestamp).getTime();
  return (Date.now() - lockTime) < HARD_RELEASE_MINUTES * 60000;
}

// Utility: canAcquireLock — Permission check
export function canAcquireLock(
  card: QueueCard, 
  currentUserId: string | undefined, 
  currentUserRole: string | undefined
): { allowed: boolean; reason?: string } {
  if (!currentUserId || !currentUserRole) {
    return { allowed: false, reason: "NOT_AUTHENTICATED" };
  }

  if (!["receptionist", "doctor", "clinic_admin"].includes(currentUserRole)) {
    return { allowed: false, reason: "ROLE_FORBIDDEN" };
  }

  if (card.sessionStatus === "completed" || card.sessionStatus === "cancelled") {
    return { allowed: false, reason: "SESSION_CLOSED" };
  }

  if (card.isLocked && card.lockHolderId !== currentUserId) {
    return { allowed: false, reason: "ALREADY_LOCKED" };
  }

  if (currentUserRole === "doctor" && card.doctorId !== currentUserId) {
    return { allowed: false, reason: "NOT_YOUR_SESSION" };
  }

  return { allowed: true };
}

// Utility: isDoctor — Common check
export function isDoctor(role: string | null): boolean {
  return role === "doctor";
}

// Utility: canAccessInvoices — Doctors are blocked (RLS + UI)
export function canAccessInvoices(role: string | null): boolean {
  if (!role) return false;
  return role !== "doctor";
}