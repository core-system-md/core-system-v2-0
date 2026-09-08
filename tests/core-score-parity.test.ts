import { describe, expect, it } from 'vitest';
import { calculatePqsPenalty } from '../src/core/rules/scoring/PqsPenaltyCalculator';

describe('PQS penalty formula contract', () => {
  it('applies the percentage penalty before the final backend ROUND', () => {
    const raw = 500.54;
    const penalty = calculatePqsPenalty(401).penalty;
    const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));

    // Constitution/Blueprint: RAW = 500.54; penalty = 40.1; backend = ROUND(460.44) = 460.
    expect(penalty).toBeCloseTo(40.1, 10);
    expect(backend).toBe(460);
  });

  it('uses unrounded percentages for both PQS tiers', () => {
    expect(calculatePqsPenalty(401).penalty).toBeCloseTo(40.1, 10);
    expect(calculatePqsPenalty(701).penalty).toBeCloseTo(140.2, 10);
    expect(calculatePqsPenalty(399).penalty).toBe(0);
  });
});
