/**
 * @file SessionLifecycle.ts
 * @description Session state machine -- Constitution §5
 */
export type SessionStatus =
  | 'waiting'
  | 'in_consultation'
  | 'pending_close'
  | 'auto_closed'
  | 'completed'
  | 'cancelled'
  | 'System_Closed_Timeout';

export interface SessionLifecycleConfig {
  bufferWindowMinutes: number;
  autoCloseMinutes: number;
}

export const DEFAULT_LIFECYCLE_CONFIG: SessionLifecycleConfig = {
  bufferWindowMinutes: 5,
  autoCloseMinutes: 60,
} as const;

export function canTransition(from: SessionStatus, to: SessionStatus): boolean {
  const transitions: Record<SessionStatus, SessionStatus[]> = {
    waiting: ['in_consultation', 'cancelled'],
    in_consultation: ['pending_close', 'cancelled'],
    pending_close: ['completed', 'auto_closed', 'System_Closed_Timeout'],
    auto_closed: [],
    completed: [],
    cancelled: [],
    System_Closed_Timeout: [],
  };
  return transitions[from]?.includes(to) ?? false;
}

export function getNextValidStatuses(current: SessionStatus): SessionStatus[] {
  const transitions: Record<SessionStatus, SessionStatus[]> = {
    waiting: ['in_consultation', 'cancelled'],
    in_consultation: ['pending_close', 'cancelled'],
    pending_close: ['completed', 'auto_closed', 'System_Closed_Timeout'],
    auto_closed: [],
    completed: [],
    cancelled: [],
    System_Closed_Timeout: [],
  };
  return transitions[current] ?? [];
}
