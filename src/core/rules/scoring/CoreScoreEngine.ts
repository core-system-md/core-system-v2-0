/**
 * @file CoreScoreEngine.ts
 * @description CORE Score calculation — Constitution §4.1 Sacred Formula
 * @warning Weights are IMMUTABLE. No AI may modify without Yazeed Waleed approval.
 * @constitution §4.1, §11 — Edge Function 'score-calculator' is authoritative.
 *                     Local calc is FALLBACK ONLY for offline scenarios.
 */

import { supabase } from '../../../infrastructure/supabase/client';
import { eventBus } from '../../events/EventBus';

export const INDICATOR_WEIGHTS = {
  APS: 0.28,
  DRI: 0.24,
  RVS: 0.20,
  URI: 0.15,
  TSI: 0.13,
} as const;

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

export interface ScoreIndicators {
  APS: number;
  DRI: number;
  RVS: number;
  URI: number;
  TSI: number;
  PQS: number;
}

export interface ScoreCalculationContext {
  sessionId: string;
  tenantId: string;
}

export type PatientClass =
  | 'hot_lead'
  | 'qualified'
  | 'high_priority'
  | 'medium_priority'
  | 'low_priority';

export type PqsTier = 'none' | 'low' | 'high';

export interface CoreScoreResult {
  backend: number;
  display: number;
  patientClass: PatientClass;
  raw: number;
  penalty: number;
  pqsTier: PqsTier;
  ltvMode?: 'first_time' | 'weighted_ltv';
}

function getPqsTier(pqs: number): PqsTier {
  if (pqs >= 700) return 'high';
  if (pqs >= 400) return 'low';
  return 'none';
}

function calculatePqsPenalty(pqs: number): { penalty: number; tier: PqsTier } {
  const tier = getPqsTier(pqs);
  switch (tier) {
    case 'high': return { penalty: pqs * 0.20, tier };
    case 'low': return { penalty: pqs * 0.10, tier };
    case 'none': return { penalty: 0, tier };
  }
}

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
    hot_lead: '#ef4444',
    qualified: '#22c55e',
    high_priority: '#f59e0b',
    medium_priority: '#3b82f6',
    low_priority: '#6b7280',
  };
  return colors[patientClass] ?? '#6b7280';
}

export function computeWeightedScore(
  historicalAvg: number,
  sessionScore: number,
  lastVisitDate: Date | null
): { score: number; mode: 'first_time' | 'weighted_ltv'; monthsAbsent: number } {
  const monthsAbsent = lastVisitDate
    ? (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : Infinity;

  if (monthsAbsent > 18) {
    return { score: Math.round(sessionScore), mode: 'first_time', monthsAbsent };
  }

  return {
    score: Math.round(historicalAvg * 0.60 + sessionScore * 0.40),
    mode: 'weighted_ltv',
    monthsAbsent,
  };
}

export function calculateCoreScore(indicators: ScoreIndicators): CoreScoreResult {
  for (const [key, value] of Object.entries(indicators)) {
    if (!Number.isInteger(value) || value < 0 || value > 1000) {
      throw new Error(`[INVALID INPUT] ${key} must be integer 0–1000, got ${value}`);
    }
  }

  const raw =
    indicators.APS * INDICATOR_WEIGHTS.APS +
    indicators.DRI * INDICATOR_WEIGHTS.DRI +
    indicators.RVS * INDICATOR_WEIGHTS.RVS +
    indicators.URI * INDICATOR_WEIGHTS.URI +
    indicators.TSI * INDICATOR_WEIGHTS.TSI;

  const { penalty, tier: pqsTier } = calculatePqsPenalty(indicators.PQS);
  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  const display = Math.round((backend / 10.0) * 10) / 10;
  const patientClass = classifyPatient(display);

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

export class CoreScoreEngine {
  static async calculate(
    indicators: ScoreIndicators,
    context: ScoreCalculationContext,
  ): Promise<CoreScoreResult> {
    const { data, error } = await supabase.functions.invoke('score-calculator', {
      body: {
        indicators,
        sessionId: context.sessionId,
        tenantId: context.tenantId,
      },
    });

    if (error) {
      console.error('[CoreScoreEngine] Edge Function error:', error);
      throw new Error('Score calculation failed');
    }

    return data as CoreScoreResult;
  }

  static calculateLocal(indicators: ScoreIndicators): CoreScoreResult {
    console.warn(
      '[DEPRECATED §11] calculateLocal() is offline fallback only. ' +
        'Use CoreScoreEngine.calculate() for authoritative results.'
    );
    return calculateCoreScore(indicators);
  }
}

export default CoreScoreEngine;
