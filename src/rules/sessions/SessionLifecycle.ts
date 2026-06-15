// src/rules/sessions/SessionLifecycle.ts
// State machine: pending → checked_in → in_progress → completed
// With guards for each transition

import type { SessionStatus } from '../../shared/types/database';

export type TransitionGuard = 'allowed' | 'blocked' | 'requires_payment' | 'requires_lock';

export interface TransitionRequest {
  from: SessionStatus;
  to: SessionStatus;
  hasPaidInvoice: boolean;
  lockHolderId: string | null;
  requesterId: string;
}

const VALID_TRANSITIONS: Record<SessionStatus, SessionStatus[]> = {
  pending: ['checked_in', 'cancelled', 'no_show'],
  checked_in: ['in_progress', 'cancelled', 'abandoned'],
  in_progress: ['completed', 'abandoned'],
  completed: [],
  cancelled: [],
  no_show: [],
  abandoned: [],
  rescheduled: ['pending'],
};

export function validateTransition(req: TransitionRequest): TransitionGuard {
  const { from, to, hasPaidInvoice, lockHolderId, requesterId } = req;

  const allowedTargets = VALID_TRANSITIONS[from] || [];
  if (!allowedTargets.includes(to)) return 'blocked';

  // Consultation Fee Gate
  if (from === 'checked_in' && to === 'in_progress' && !hasPaidInvoice) {
    return 'requires_payment';
  }

  // Lock Gate
  if (to === 'in_progress' && lockHolderId !== requesterId) {
    return 'requires_lock';
  }

  return 'allowed';
}

export function getTerminalStatuses(): SessionStatus[] {
  return ['completed', 'cancelled', 'no_show', 'abandoned'];
}

export function isTerminal(status: SessionStatus): boolean {
  return getTerminalStatuses().includes(status);
}
