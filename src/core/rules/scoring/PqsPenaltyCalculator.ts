/**
 * @file PqsPenaltyCalculator.ts
 * @description PQS penalty -- Constitution §4.1
 */
export type PqsTier = 'none' | 'low' | 'high';

export interface PqsPenaltyResult {
  penalty: number; tier: PqsTier; description: string;
}

export function calculatePqsPenalty(pqs: number): PqsPenaltyResult {
  if (pqs >= 700) return { penalty: Math.round(pqs * 0.20), tier: 'high', description: `High: PQS ${pqs}` };
  if (pqs >= 400) return { penalty: Math.round(pqs * 0.10), tier: 'low', description: `Low: PQS ${pqs}` };
  return { penalty: 0, tier: 'none', description: `None: PQS ${pqs}` };
}

export function isValidPqs(pqs: number): boolean {
  return Number.isInteger(pqs) && pqs >= 0 && pqs <= 1000;
}

export function getPqsTier(pqs: number): PqsTier {
  if (pqs >= 700) return 'high';
  if (pqs >= 400) return 'low';
  return 'none';
}
