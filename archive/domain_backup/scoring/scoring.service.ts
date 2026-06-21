// ============================================================
// src/domain/scoring/scoring.service.ts
// CORE SYSTEM v2.1 — CORE Score Engine Service
// Blueprint Compliant: Section 20 (core_rules_config) + Page 36 Formulas
// ============================================================

import { supabase } from "@/infrastructure/supabase/client";

// Indicator Weights (from Blueprint Page 36)
// Pulled from core_rules_config at runtime, with these defaults:
const DEFAULT_WEIGHTS = {
  APS: 0.28,  // Acceptance Probability Score
  DRI: 0.24,  // Decision Readiness Index
  RVS: 0.20,  // Results Value Score
  URI: 0.15,  // User Receptiveness Index
  TSI: 0.13,  // Trust Sensitivity Index
};

// PQS is a penalty, not additive weight

export interface IndicatorInputs {
  APS: number;  // 0-1000 backend scale
  DRI: number;
  RVS: number;
  URI: number;
  TSI: number;
  PQS: number;  // Price Qualification Score (penalty)
}

export interface ScoreResult {
  backend: number;      // 0-1000 (integer)
  display: number;      // 0.0-100.0 (1 decimal)
  patientClass: PatientClass;
  mode: "first_time" | "weighted_ltv";
}

export type PatientClass = 
  | "low_priority" 
  | "medium_priority" 
  | "high_priority" 
  | "qualified" 
  | "hot_lead";

// Core Score Calculation
// Blueprint Formula: APS×0.28 + DRI×0.24 + RVS×0.20 + URI×0.15 + TSI×0.13
export function computeCoreScore(
  indicators: IndicatorInputs,
  weights = DEFAULT_WEIGHTS
): any {
  const raw =
    indicators.APS * weights.APS +
    indicators.DRI * weights.DRI +
    indicators.RVS * weights.RVS +
    indicators.URI * weights.URI +
    indicators.TSI * weights.TSI;

  // Tiered PQS penalty (Blueprint Page 36)
  let penalty = 0;
  if (indicators.PQS >= 700) {
    penalty = indicators.PQS * 0.20;
  } else if (indicators.PQS >= 400) {
    penalty = indicators.PQS * 0.10;
  }

  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  const display = Math.round((backend / 10.0) * 10) / 10; // ROUND to 1 decimal

  return {
    backend,
    display,
    patientClass: classifyPatient(display),
  };
}

// 60/40 LTV Weighted Score (Blueprint Page 36)
export function computeWeightedScore(
  historicalAvg: number,     // 0-1000
  sessionScore: number,       // 0-1000
  lastVisitDate: Date | null
): { score: number; mode: "first_time" | "weighted_ltv" } {
  const monthsAbsent = lastVisitDate
    ? (Date.now() - lastVisitDate.getTime()) / (1000 * 60 * 60 * 24 * 30)
    : Infinity;

  // If >18 months absent, treat as first-time (no historical weight)
  if (monthsAbsent > 18) {
    return { score: sessionScore, mode: "first_time" };
  }

  const weighted = Math.round(historicalAvg * 0.60 + sessionScore * 0.40);
  return { score: weighted, mode: "weighted_ltv" };
}

// Patient Classification (Blueprint Page 36)
export function classifyPatient(display: number): PatientClass {
  if (display >= 90) return "hot_lead";
  if (display >= 80) return "qualified";
  if (display >= 60) return "high_priority";
  if (display >= 40) return "medium_priority";
  return "low_priority";
}

// Service: Save Score to Database
// Blueprint: Wraps CoreScoreEngine + DB write
export async function saveSessionScore(
  sessionId: string,
  tenantId: string,
  indicators: IndicatorInputs,
  historicalAvg?: number,
  lastVisitDate?: Date | null
): Promise<any> {
  // 1. Compute session score
  const sessionScore = computeCoreScore(indicators);

  // 2. Apply LTV weighting if historical data available
  let finalScore: ScoreResult;
  if (historicalAvg !== undefined) {
    const weighted = computeWeightedScore(historicalAvg, sessionScore.backend, lastVisitDate || null);
    finalScore = {
      ...sessionScore,
      backend: weighted.score,
      display: Math.round((weighted.score / 10.0) * 10) / 10,
      patientClass: classifyPatient(Math.round((weighted.score / 10.0) * 10) / 10),
      mode: weighted.mode,
    };
  } else {
    finalScore = { ...sessionScore, mode: "first_time" };
  }

  // 3. Write to clinic_visit_sessions
  const { error } = await supabase
    .from("clinic_visit_sessions")
    .update({
      score_aps: indicators.APS,
      score_dri: indicators.DRI,
      score_tsi: indicators.TSI,
      score_uri: indicators.URI,
      score_pqs: indicators.PQS,
      score_rvs: indicators.RVS,
      core_score_backend: finalScore.backend,
      core_score_display: finalScore.display,
      patient_class: finalScore.patientClass,
      scoring_mode: finalScore.mode,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("tenant_id", tenantId);

  if (error) throw new Error(`Score save failed: ${error.message}`);

  // 4. Update longitudinal profile (async, non-blocking)
  await updateLongitudinalProfile(sessionId, tenantId, finalScore);

  return finalScore;
}

// Helper: Update patient_longitudinal_profiles
// Blueprint: Table 6 — cumulative behavioral history
async function updateLongitudinalProfile(
  sessionId: string,
  tenantId: string,
  score: ScoreResult
): Promise<void> {
  // Get patient_id from session
  const { data: session } = await supabase
    .from("clinic_visit_sessions")
    .select("patient_id")
    .eq("id", sessionId)
    .single();

  if (!session) return;

  const patientId = session.patient_id;

  // Upsert longitudinal profile
  const { error } = await supabase
    .from("patient_longitudinal_profiles")
    .upsert({
      tenant_id: tenantId,
      patient_id: patientId,
      historical_core_score_avg: score.backend,
      last_visit_date: new Date().toISOString().split("T")[0],
      last_calculated_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, {
      onConflict: "tenant_id,patient_id",
    });

  if (error) {
    console.warn("Longitudinal profile update failed:", error.message);
  }
}

// Prestige Inflation Filter (Blueprint: Integrity Filter 1)
export function detectPrestigeInflation(
  currentScore: number,
  historicalScores: number[]
): { detected: boolean; factor: number } {
  if (historicalScores.length < 3) return { detected: false, factor: 1.0 };

  const avg = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
  const deviation = (currentScore - avg) / avg;

  // If current score is >50% above historical average, flag inflation
  if (deviation > 0.50) {
    return { detected: true, factor: 1.0 - (deviation * 0.5) };
  }

  return { detected: false, factor: 1.0 };
}

// Triangulation Filter (Blueprint: Integrity Filter 2)
export function verifyTriangulation(
  invoice: { doctor_par_confirmed: boolean; collected_reception: boolean; amount_paid_subunits: number; total_subunits: number }
): boolean {
  return (
    invoice.doctor_par_confirmed &&
    invoice.collected_reception &&
    invoice.amount_paid_subunits >= invoice.total_subunits * 0.80
  );
}