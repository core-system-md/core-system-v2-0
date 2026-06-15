// src/shared/types/scoring.ts
// CORE Score Engine types — matches Blueprint v2.1 Section 19

export interface CoreIndicators {
  APS: number; // Acceptance Probability Score (0–1000)
  DRI: number; // Decision Readiness Index (0–1000)
  RVS: number; // Results Value Score (0–1000)
  URI: number; // User Receptiveness Index (0–1000)
  TSI: number; // Trust Sensitivity Index (0–1000)
  PQS: number; // Price Qualification Score (0–1000) — penalty, not additive
}

export interface CoreScoreResult {
  backend: number; // 0–1000 (raw precision)
  display: number; // 0–100.0 (1 decimal)
  patientClass: PatientClass;
}

export interface WeightedScoreResult {
  score: number;
  mode: 'first_time' | 'weighted_ltv';
}

export interface LtvInputs {
  historicalAvg: number;
  sessionScore: number;
  lastVisitDate: Date | null;
}

export type PatientClass = 'low_priority' | 'medium_priority' | 'high_priority' | 'qualified' | 'hot_lead';

export interface ScoreWeights {
  APS: number;
  DRI: number;
  RVS: number;
  URI: number;
  TSI: number;
  // PQS is penalty, not weight
}

export const DEFAULT_WEIGHTS: ScoreWeights = {
  APS: 0.28,
  DRI: 0.24,
  RVS: 0.20,
  URI: 0.15,
  TSI: 0.13,
};

export interface PqsPenaltyTier {
  threshold: number;
  penaltyRate: number;
}

export const PQS_PENALTY_TIERS: PqsPenaltyTier[] = [
  { threshold: 700, penaltyRate: 0.20 },
  { threshold: 400, penaltyRate: 0.10 },
  // below 400: no penalty
];
