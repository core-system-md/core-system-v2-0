import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/infrastructure/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

import {
  calculateCoreScore,
  classifyPatient,
  computeWeightedScore,
  INDICATOR_WEIGHTS,
  type ScoreIndicators,
} from '../src/core/rules/scoring/CoreScoreEngine';
import { eventBus } from '../src/core/events/EventBus';

describe('CORE Score rules', () => {
  beforeEach(() => {
    eventBus.clear();
  });

  it('keeps the Constitution weights unchanged and normalized', () => {
    expect(INDICATOR_WEIGHTS).toEqual({
      APS: 0.28,
      DRI: 0.24,
      RVS: 0.2,
      URI: 0.15,
      TSI: 0.13,
    });

    const sum = Object.values(INDICATOR_WEIGHTS).reduce((total, value) => total + value, 0);
    expect(sum).toBe(1);
  });

  it('calculates the weighted backend score and PQS penalty', () => {
    const indicators: ScoreIndicators = {
      APS: 800,
      DRI: 700,
      RVS: 600,
      URI: 500,
      TSI: 400,
      PQS: 800,
    };

    const listener = vi.fn();
    eventBus.subscribe('score:calculated', listener);

    const result = calculateCoreScore(indicators);

    expect(result.raw).toBe(620);
    expect(result.penalty).toBe(160);
    expect(result.pqsTier).toBe('high');
    expect(result.backend).toBe(460);
    expect(result.display).toBe(46);
    expect(result.patientClass).toBe('medium_priority');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('applies the low PQS penalty threshold', () => {
    const result = calculateCoreScore({
      APS: 1000,
      DRI: 1000,
      RVS: 1000,
      URI: 1000,
      TSI: 1000,
      PQS: 500,
    });

    expect(result.raw).toBe(1000);
    expect(result.penalty).toBe(50);
    expect(result.pqsTier).toBe('low');
    expect(result.backend).toBe(950);
    expect(result.display).toBe(95);
    expect(result.patientClass).toBe('hot_lead');
  });

  it('rejects non-integer and out-of-range indicators', () => {
    expect(() =>
      calculateCoreScore({ APS: 10.5, DRI: 0, RVS: 0, URI: 0, TSI: 0, PQS: 0 }),
    ).toThrow(/APS must be integer/);

    expect(() =>
      calculateCoreScore({ APS: 1001, DRI: 0, RVS: 0, URI: 0, TSI: 0, PQS: 0 }),
    ).toThrow(/APS must be integer/);
  });
});

describe('Patient classification', () => {
  it('uses the defined display-score bands', () => {
    expect(classifyPatient(95)).toBe('hot_lead');
    expect(classifyPatient(80)).toBe('qualified');
    expect(classifyPatient(60)).toBe('high_priority');
    expect(classifyPatient(40)).toBe('medium_priority');
    expect(classifyPatient(39.9)).toBe('low_priority');
  });
});

describe('Weighted LTV calculation', () => {
  it('uses session score only after more than 18 months absent', () => {
    const result = computeWeightedScore(900, 500, new Date(Date.now() - 19 * 30 * 24 * 60 * 60 * 1000));

    expect(result.mode).toBe('first_time');
    expect(result.score).toBe(500);
    expect(result.monthsAbsent).toBeGreaterThan(18);
  });

  it('uses the 60/40 weighted mode within the 18-month window', () => {
    const result = computeWeightedScore(900, 500, new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000));

    expect(result.mode).toBe('weighted_ltv');
    expect(result.score).toBe(740);
    expect(result.monthsAbsent).toBeGreaterThan(5);
    expect(result.monthsAbsent).toBeLessThan(7);
  });
});
