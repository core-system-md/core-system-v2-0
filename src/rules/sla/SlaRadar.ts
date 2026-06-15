// src/rules/sla/SlaRadar.ts
// Computes green/yellow/red from wait time + queue scan

import type { SlaStatus } from './SlaThresholds';
import { computeSlaStatus, DEFAULT_SLA_THRESHOLDS } from './SlaThresholds';

export interface SlaRadarReading {
  sessionId: string;
  waitMinutes: number;
  status: SlaStatus;
  thresholdBreached: boolean;
  minutesOverThreshold: number;
}

export function scanSession(
  sessionId: string,
  actualCheckIn: string | null,
  actualStart: string | null
): SlaRadarReading | null {
  if (!actualCheckIn || actualStart) {
    return null; // Not waiting
  }

  const now = new Date();
  const checkIn = new Date(actualCheckIn);
  const waitMinutes = Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60));

  const status = computeSlaStatus(waitMinutes);
  const thresholdBreached = status === 'red';
  const minutesOverThreshold = thresholdBreached
    ? waitMinutes - DEFAULT_SLA_THRESHOLDS.redMinMinutes
    : 0;

  return {
    sessionId,
    waitMinutes,
    status,
    thresholdBreached,
    minutesOverThreshold,
  };
}

export function scanQueue(
  sessions: Array<{ id: string; actual_check_in: string | null; actual_start: string | null }>
): SlaRadarReading[] {
  return sessions
    .map((s) => scanSession(s.id, s.actual_check_in, s.actual_start))
    .filter((r): r is SlaRadarReading => r !== null);
}
