// src/rules/scoring/CoreScoreEngine.ts
// Main CORE Score formula: APS×0.28 + DRI×0.24 + RVS×0.20 + URI×0.15 + TSI×0.13
// Minus tiered PQS penalty
// Output: backend (0-1000) + display (0-100.0) + patientClass

import type {
  CoreIndicators,
  CoreScoreResult,
  ScoreWeights,
} from '../../shared/types/scoring';
import { DEFAULT_WEIGHTS } from './IndicatorWeights';
import { calculatePqsPenalty } from './PqsPenaltyCalculator';
import { classifyPatient } from './PatientClassifier';

/**
 * Compute raw score before PQS penalty
 */
function computeRawScore(
  indicators: CoreIndicators,
  weights: ScoreWeights = DEFAULT_WEIGHTS
): number {
  return (
    indicators.APS * weights.APS +
    indicators.DRI * weights.DRI +
    indicators.RVS * weights.RVS +
    indicators.URI * weights.URI +
    indicators.TSI * weights.TSI
  );
}

/**
 * Main entry point: Compute complete CORE Score
 */
export function computeCoreScore(
  indicators: CoreIndicators,
  weights: ScoreWeights = DEFAULT_WEIGHTS
): CoreScoreResult {
  // 1. Raw weighted sum
  const raw = computeRawScore(indicators, weights);
  
  // 2. PQS penalty (subtractive, not weighted)
  const penalty = calculatePqsPenalty(indicators.PQS);
  
  // 3. Backend precision (0-1000, INTEGER)
  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  
  // 4. Display value (0-100.0, 1 decimal)
  const display = Math.round((backend / 10) * 10) / 10;
  
  // 5. Patient classification
  const patientClass = classifyPatient(display);
  
  return { backend, display, patientClass };
}

/**
 * Batch compute for multiple patients (dashboard/analytics)
 */
export function computeCoreScoreBatch(
  entries: Array<{ patientId: string; indicators: CoreIndicators }>,
  weights: ScoreWeights = DEFAULT_WEIGHTS
): Array<{ patientId: string; result: CoreScoreResult }> {
  return entries.map((entry) => ({
    patientId: entry.patientId,
    result: computeCoreScore(entry.indicators, weights),
  }));
}

/**
 * Recompute score when a single indicator changes (live updates)
 */
export function recomputeWithDelta(
  currentIndicators: CoreIndicators,
  changedField: keyof CoreIndicators,
  newValue: number,
  weights: ScoreWeights = DEFAULT_WEIGHTS
): CoreScoreResult {
  const updated = { ...currentIndicators, [changedField]: newValue };
  return computeCoreScore(updated, weights);
}
