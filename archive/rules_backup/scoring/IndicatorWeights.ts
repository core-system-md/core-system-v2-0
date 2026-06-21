// src/rules/scoring/IndicatorWeights.ts
// CORE Score weights — pulled from core_rules_config or hardcoded fallback
// Blueprint v2.1: APS 0.28 | DRI 0.24 | RVS 0.20 | URI 0.15 | TSI 0.13

import type { ScoreWeights } from '../../shared/types/scoring';

export const DEFAULT_WEIGHTS: ScoreWeights = {
  APS: 0.28,
  DRI: 0.24,
  RVS: 0.20,
  URI: 0.15,
  TSI: 0.13,
};

/**
 * Fetch weights from core_rules_config if available,
 * otherwise fallback to defaults.
 * This allows per-tenant override via database.
 */
export async function getActiveWeights(
  _supabaseClient: unknown
): Promise<ScoreWeights> {
  // TODO: Implement DB fetch from core_rules_config where rule_key = 'weights'
  // For now, return defaults to avoid blocking the engine.
  return DEFAULT_WEIGHTS;
}

/**
 * Validate that weights sum to approximately 1.0
 */
export function validateWeights(weights: ScoreWeights): boolean {
  const sum = weights.APS + weights.DRI + weights.RVS + weights.URI + weights.TSI;
  return Math.abs(sum - 1.0) < 0.001;
}
