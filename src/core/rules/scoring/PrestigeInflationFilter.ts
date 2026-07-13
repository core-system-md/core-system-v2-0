/**
 * @file PrestigeInflationFilter.ts
 * @description Integrity Filter 1 -- Constitution §4.1
 */
export interface PrestigeInflationResult {
  detected: boolean; factor: number; reason: string;
}

const INFLATION_THRESHOLD = 1.15;
const MAX_ACCEPTABLE_FACTOR = 1.30;

export function detectPrestigeInflation(currentScores: number[], historicalAvg: number): PrestigeInflationResult {
  if (currentScores.length === 0 || historicalAvg === 0) return { detected: false, factor: 1.0, reason: 'Insufficient data' };
  const currentAvg = currentScores.reduce((a, b) => a + b, 0) / currentScores.length;
  const factor = currentAvg / historicalAvg;
  if (factor > MAX_ACCEPTABLE_FACTOR) return { detected: true, factor: Math.round(factor * 1000) / 1000, reason: `Critical inflation` };
  if (factor > INFLATION_THRESHOLD) return { detected: true, factor: Math.round(factor * 1000) / 1000, reason: `Elevated scores` };
  return { detected: false, factor: Math.round(factor * 1000) / 1000, reason: 'Normal' };
}

export function applyInflationCorrection(score: number, factor: number): number {
  if (factor <= 1.0) return score;
  return Math.max(0, Math.min(1000, Math.round(score / Math.min(factor, MAX_ACCEPTABLE_FACTOR))));
}
