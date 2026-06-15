// src/rules/scoring/PqsPenaltyCalculator.ts
// Tiered PQS penalty: <400 = 0% | 400-699 = 10% | >=700 = 20%

import type { PqsPenaltyTier } from '../../shared/types/scoring';

export const PQS_PENALTY_TIERS: PqsPenaltyTier[] = [
  { threshold: 700, penaltyRate: 0.20 },
  { threshold: 400, penaltyRate: 0.10 },
  // Below 400: no penalty
];

/**
 * Calculate penalty amount based on PQS value
 * Returns the penalty value (subtracted from raw score later)
 */
export function calculatePqsPenalty(pqs: number): number {
  const clamped = Math.max(0, Math.min(1000, pqs));
  
  for (const tier of PQS_PENALTY_TIERS) {
    if (clamped >= tier.threshold) {
      return Math.round(clamped * tier.penaltyRate);
    }
  }
  
  return 0;
}

/**
 * Get penalty tier label for display/debugging
 */
export function getPqsPenaltyLabel(pqs: number): string {
  if (pqs >= 700) return 'heavy_penalty';
  if (pqs >= 400) return 'moderate_penalty';
  return 'no_penalty';
}
