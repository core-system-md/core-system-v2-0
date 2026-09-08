import { describe, expect, it } from 'vitest';
import { calculateCoreScore } from '../src/core/rules/scoring/CoreScoreEngine';
import { calculatePqsPenalty } from '../src/core/rules/scoring/PqsPenaltyCalculator';

describe('CoreScore local formula contract', () => {
  it('applies the PQS percentage before the final backend ROUND', () => {
    const result = calculateCoreScore({
      APS: 982,
      DRI: 293,
      RVS: 214,
      URI: 267,
      TSI: 557,
      PQS: 401,
    });

    // RAW = 500.54; PQS penalty = 40.1; BACKEND = ROUND(460.44) = 460.
    expect(result.raw).toBe(501);
    expect(result.penalty).toBeCloseTo(40.1, 10);
    expect(result.backend).toBe(460);
    expect(result.display).toBe(46);
    expect(result.pqsTier).toBe('low');
  });

  it('uses the same unrounded PQS penalty in the shared calculator', () => {
    expect(calculatePqsPenalty(401).penalty).toBeCloseTo(40.1, 10);
    expect(calculatePqsPenalty(700).penalty).toBeCloseTo(140, 10);
  });
});
