/**
 * @file CoreScoreEngine.ts
 * @description CORE Score calculation — Constitution §4.1 Sacred Formula
 * @warning Weights are IMMUTABLE. No AI may modify without Yazeed Waleed approval.
 * @constitution §4.1, §11 — Edge Function 'score-calculator' is authoritative.
 *                     Local calc is FALLBACK ONLY for offline scenarios.
 */

import { supabase } from '../../../infrastructure/supabase/client';
import { eventBus } from '../../events/EventBus';

// ============================================
// IMMUTABLE INDICATOR WEIGHTS — DO NOT MODIFY
// ============================================
export const INDICATOR_WEIGHTS = {
  APS: 0.28, // Acceptance Probability Score
  DRI: 0.24, // Decision Readiness Index
  RVS: 0.20, // Results Value Score
  URI: 0.15, // User Receptiveness Index
  TSI: 0.13, // Trust Sensitivity Index
} as const;

// Validate weights sum to 1.0 at module load
const WEIGHT_SUM =
  INDICATOR_WEIGHTS.APS +
  INDICATOR_WEIGHTS.DRI +
  INDICATOR_WEIGHTS.RVS +
  INDICATOR_WEIGHTS.URI +
  INDICATOR_WEIGHTS.TSI;

if (Math.abs(WEIGHT_SUM - 1.0) > 0.0001) {
  throw new Error(
    `[CONSTITUTION VIOLATION §4.1] Indicator weights sum to ${WEIGHT_SUM}, expected 1.0`
  );
}

// ============================================
// TYPES
// ============================================
export interface ScoreIndicators {
  APS: number; // 0–1000
  DRI: number; // 0–1000
  RVS: number; // 0–1000
  URI: number; // 0–1000
  TSI: number; // 0–1000
  PQS: number; // 0–1000
}

export type PatientClass =
  | 'hot_lead'
  | 'qualified'
  | 'high_priority'
  | 'medium_priority'
  | 'low_priority';

export type PqsTier = 'none' | 'low' | 'high';

export interface CoreScoreResult {
  backend: number;      // 0–1000
  display: number;      // 0.0–100.0
  patientClass: PatientClass;
  raw: number;
  penalty: number;
  pqsTier: PqsTier;
}

// ============================================
// PQS PENALTY CALCULATOR — §4.1
// ============================================
function getPqsTier(pqs: number): PqsTier {
  if (pqs >= 700) return 'high';
  if (pqs >= 400) return 'low';
  return 'none';
}

function calculatePqsPenalty(pqs: number): { penalty: number; tier: PqsTier } {
  const tier = getPqsTier(pqs);
  switch (tier) {
    case 'high':
      return { penalty: Math.round(pqs * 0.20), tier };
    case 'low':
      return { penalty: Math.round(pqs * 0.10), tier };
    case 'none':
      return { penalty: 0, tier };
  }
}

// ============================================
// PATIENT CLASSIFICATION — §4.2
// ============================================
export function classifyPatient(displayScore: number): PatientClass {
  if (displayScore >= 90.0) return 'hot_lead';
  if (displayScore >= 80.0) return 'qualified';
  if (displayScore >= 60.0) return 'high_priority';
  if (displayScore >= 40.0) return 'medium_priority';
  return 'low_priority';
}

export function getPatientClassLabel(patientClass: PatientClass): string {
  const labels: Record<PatientClass, string> = {
    hot_lead: 'Hot Lead 🔥',
    qualified: 'Qualified ✅',
    high_priority: 'High Priority ⚡',
    medium_priority: 'Medium Priority 📋',
    low_priority: 'Low Priority 📝',
  };
  return labels[patientClass] ?? 'Unknown';
}

export function getPatientClassColor(patientClass: PatientClass): string {
  const colors: Record<PatientClass, string> = {
    hot_lead: '#ef4444',      // red-500
    qualified: '#22c55e',     // green-500
    high_priority: '#f59e0b',  // amber-500
    medium_priority: '#3b82f6',  // blue-500
    low_priority: '#6b7280',   // gray-500
  };
  return colors[patientClass] ?? '#6b7280';
}

// ============================================
// 60/40 LTV WEIGHTED RULE — §4.3
// ============================================
export interface LtvResult {
  score: number;
  mode: 'first_time' | 'weighted_ltv';
  monthsAbsent: number;
}

export function computeWeightedScore(
  historicalAvg: number,
  sessionScore: number,
  lastVisitDate: Date | null
): LtvResult {
  const monthsAbsent = lastVisitDate
    ? (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : Infinity;

  if (monthsAbsent > 18) {
    return {
      score: Math.round(sessionScore),
      mode: 'first_time',
      monthsAbsent,
    };
  }

  const weighted = Math.round(historicalAvg * 0.60 + sessionScore * 0.40);
  return { score: weighted, mode: 'weighted_ltv', monthsAbsent };
}

// ============================================
// CORE SCORE CALCULATION — §4.1 SACRED FORMULA
// ============================================

/**
 * Calculate CORE Score using the sacred Constitution formula.
 *
 * FORMULA:
 *   RAW = (APS×0.28) + (DRI×0.24) + (RVS×0.20) + (URI×0.15) + (TSI×0.13)
 *   PQS >= 700: penalty = PQS × 0.20
 *   PQS >= 400: penalty = PQS × 0.10
 *   PQS < 400:  penalty = 0
 *   BACKEND = ROUND(MAX(0, MIN(1000, RAW − penalty)))
 *   DISPLAY = ROUND(BACKEND / 10.0, 1)
 */
export function calculateCoreScore(indicators: ScoreIndicators): CoreScoreResult {
  // Validate inputs
  for (const [key, value] of Object.entries(indicators)) {
    if (!Number.isInteger(value) || value < 0 || value > 1000) {
      throw new Error(
        `[INVALID INPUT] ${key} must be integer 0–1000, got ${value}`
      );
    }
  }

  // RAW calculation
  const raw =
    indicators.APS * INDICATOR_WEIGHTS.APS +
    indicators.DRI * INDICATOR_WEIGHTS.DRI +
    indicators.RVS * INDICATOR_WEIGHTS.RVS +
    indicators.URI * INDICATOR_WEIGHTS.URI +
    indicators.TSI * INDICATOR_WEIGHTS.TSI;

  // PQS Penalty
  const { penalty, tier: pqsTier } = calculatePqsPenalty(indicators.PQS);

  // BACKEND: clamp 0–1000, then round
  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));

  // DISPLAY: backend/10, rounded to 1 decimal
  const display = Math.round((backend / 10.0) * 10) / 10;

  // Classification from DISPLAY score (§4.2)
  const patientClass = classifyPatient(display);

  // Emit audit event
  eventBus.emit('score:calculated', {
    backend,
    display,
    patientClass,
    indicators,
    timestamp: new Date().toISOString(),
  });

  return {
    backend,
    display,
    patientClass,
    raw: Math.round(raw),
    penalty,
    pqsTier,
  };
}

// ============================================
// EDGE FUNCTION WRAPPER — §11
// ============================================

export class CoreScoreEngine {
  /**
   * AUTHORITATIVE calculation via Edge Function.
   * Per Constitution §11: ALWAYS use backend for score calculation.
   */
  static async calculate(indicators: ScoreIndicators): Promise<CoreScoreResult> {
    const { data, error } = await supabase.functions.invoke('score-calculator', {
      body: indicators,
    });

    if (error) {
      console.error('[CoreScoreEngine] Edge Function error:', error);
      throw new Error('Score calculation failed');
    }

    return data as CoreScoreResult;
  }

  /**
   * FALLBACK local calculation — OFFLINE ONLY.
   * @deprecated Use calculate() (Edge Function) per Constitution §11.
   * This exists solely for offline PWA scenarios.
   */
  static calculateLocal(indicators: ScoreIndicators): CoreScoreResult {
    console.warn(
      '[DEPRECATED §11] calculateLocal() is offline fallback only. ' +
        'Use CoreScoreEngine.calculate() for authoritative results.'
    );
    return calculateCoreScore(indicators);
  }
}

// ============================================
// DEFAULT EXPORT
// ============================================
export default CoreScoreEngine;