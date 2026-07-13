/**
 * @file IndicatorWeights.ts
 * @description CORE Score indicator weights -- Constitution §4.1
 * @warning IMMUTABLE. No AI may modify without Yazeed Waleed approval.
 */
export interface IndicatorWeights {
  APS: number; DRI: number; RVS: number; URI: number; TSI: number;
}

export const CORE_INDICATOR_WEIGHTS: IndicatorWeights = {
  APS: 0.28, DRI: 0.24, RVS: 0.20, URI: 0.15, TSI: 0.13,
} as const;

export function validateWeights(weights: IndicatorWeights): boolean {
  const sum = weights.APS + weights.DRI + weights.RVS + weights.URI + weights.TSI;
  return Math.abs(sum - 1.0) < 0.0001;
}

export function getWeight(indicator: keyof IndicatorWeights): number {
  return CORE_INDICATOR_WEIGHTS[indicator];
}

export function getWeightEntries(): Array<[keyof IndicatorWeights, number]> {
  return Object.entries(CORE_INDICATOR_WEIGHTS) as Array<[keyof IndicatorWeights, number]>;
}
