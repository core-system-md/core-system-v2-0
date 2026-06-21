// src/rules/scoring/LtvWeightRule.ts
// 60/40 LTV Weighted Rule: 18-month decay check

import type { WeightedScoreResult, LtvInputs } from '../../shared/types/scoring';

const MONTHS_ABSENT_THRESHOLD = 18;

/**
 * Compute weighted score using 60% historical + 40% current
 * If patient absent > 18 months, treat as first-time (ignore history)
 */
export function computeWeightedScore(inputs: LtvInputs): WeightedScoreResult {
  const { historicalAvg, sessionScore, lastVisitDate } = inputs;
  
  if (!lastVisitDate) {
    // Never visited before — pure first-time
    return { score: sessionScore, mode: 'first_time' };
  }
  
  const monthsAbsent = (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsAbsent > MONTHS_ABSENT_THRESHOLD) {
    // Absent too long — historical data stale
    return { score: sessionScore, mode: 'first_time' };
  }
  
  const weighted = Math.round(historicalAvg * 0.60 + sessionScore * 0.40);
  return { score: weighted, mode: 'weighted_ltv' };
}

/**
 * Check if historical data is stale (for UI badges)
 */
export function isHistoricalStale(lastVisitDate: Date | null): boolean {
  if (!lastVisitDate) return true;
  const monthsAbsent = (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  return monthsAbsent > MONTHS_ABSENT_THRESHOLD;
}
