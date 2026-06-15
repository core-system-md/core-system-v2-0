// src/shared/types/queue.ts
// Live queue + lock governance types

import type { PatientClass } from './scoring';

export type LockState = 'available' | 'held' | 'abandoned';

export interface QueueCard {
  sessionId: string;
  patientId: string;
  patientName: string;
  priority: PatientClass;
  slaStatus: 'green' | 'yellow' | 'red';
  waitTimeMinutes: number;
  lockHolderId: string | null;
  lockHolderName: string | null;
  lockTimestamp: string | null;
  lockState: LockState;
  roomId: string | null;
  doctorId: string | null;
  procedureName: string | null;
  isInsured: boolean;
  coreScoreDisplay: number | null;
}

export interface LockAcquirePayload {
  sessionId: string;
  userId: string;
}

export interface LockReleasePayload {
  sessionId: string;
  userId: string;
  reason?: 'manual' | 'timeout' | 'session_end' | 'abandonment';
}

export interface HotSwapSuggestion {
  fromSessionId: string;
  toRoomId: string;
  reason: 'room_vacant' | 'doctor_available' | 'priority_escalation';
}
