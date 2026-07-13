/**
 * @file LtvWeightRule.ts
 * @description 60/40 LTV Rule -- Constitution §4.3
 */
export interface LtvWeightResult {
  score: number; mode: 'first_time' | 'weighted_ltv';
  monthsAbsent: number; historicalWeight: number; sessionWeight: number;
}

const MONTHS_THRESHOLD = 18;
const HISTORICAL_WEIGHT = 0.60;
const SESSION_WEIGHT = 0.40;

export function computeWeightedScore(
  historicalAvg: number, sessionScore: number, lastVisitDate: Date | null
): LtvWeightResult {
  const monthsAbsent = lastVisitDate ? (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30) : Infinity;
  if (monthsAbsent > MONTHS_THRESHOLD) {
    return { score: Math.round(sessionScore), mode: 'first_time', monthsAbsent, historicalWeight: 0, sessionWeight: 1.0 };
  }
  return { score: Math.round(historicalAvg * HISTORICAL_WEIGHT + sessionScore * SESSION_WEIGHT), mode: 'weighted_ltv', monthsAbsent, historicalWeight: HISTORICAL_WEIGHT, sessionWeight: SESSION_WEIGHT };
}

export function isFirstTimeMode(lastVisitDate: Date | null): boolean {
  if (!lastVisitDate) return true;
  return (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30) > MONTHS_THRESHOLD;
}
