// ============================================================
// CORE SYSTEM v2.1 — Edge Function: score-calculator
// CONSTITUTION §4: Core Score Formula MUST be in Backend
// NO frontend score calculation allowed
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Constitution §4.1: Immutable weights
const WEIGHTS = {
  APS: 0.28,
  DRI: 0.24,
  RVS: 0.20,
  URI: 0.15,
  TSI: 0.13,
} as const;

// Constitution §4.1: PQS Penalty tiers
function calculatePqsPenalty(pqs: number): number {
  if (pqs >= 700) return pqs * 0.20;
  if (pqs >= 400) return pqs * 0.10;
  return 0;
}

// Constitution §4.1: Core Score Calculation
function computeCoreScore(indicators: {
  APS: number;
  DRI: number;
  RVS: number;
  URI: number;
  TSI: number;
  PQS: number;
}): { backend: number; display: number; patientClass: string } {
  const raw =
    indicators.APS * WEIGHTS.APS +
    indicators.DRI * WEIGHTS.DRI +
    indicators.RVS * WEIGHTS.RVS +
    indicators.URI * WEIGHTS.URI +
    indicators.TSI * WEIGHTS.TSI;

  const penalty = calculatePqsPenalty(indicators.PQS);
  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  const display = Math.round((backend / 10) * 10) / 10;

  // Constitution §4.2: Patient Classification
  let patientClass = "low_priority";
  if (display >= 90) patientClass = "hot_lead";
  else if (display >= 80) patientClass = "qualified";
  else if (display >= 60) patientClass = "high_priority";
  else if (display >= 40) patientClass = "medium_priority";

  return { backend, display, patientClass };
}

// Constitution §4.3: 60/40 LTV Weighted Rule
function computeWeightedScore(
  historicalAvg: number,
  sessionScore: number,
  lastVisitDate: string | null
): { score: number; mode: "first_time" | "weighted_ltv" } {
  if (!lastVisitDate) {
    return { score: sessionScore, mode: "first_time" };
  }

  const monthsAbsent = (Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24 * 30);
  
  if (monthsAbsent > 18) {
    return { score: sessionScore, mode: "first_time" };
  }

  const weighted = Math.round(historicalAvg * 0.60 + sessionScore * 0.40);
  return { score: weighted, mode: "weighted_ltv" };
}

serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { indicators, historicalAvg, lastVisitDate, sessionId, tenantId } = await req.json();

    // Validate required fields
    if (!indicators || !sessionId || !tenantId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: indicators, sessionId, tenantId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate scores
    const coreScore = computeCoreScore(indicators);
    let finalScore: any = coreScore;

    // Apply 60/40 LTV rule if historical data exists
    if (historicalAvg !== undefined && historicalAvg !== null) {
      const ltvResult = computeWeightedScore(historicalAvg, coreScore.backend, lastVisitDate);
      finalScore = {
        backend: ltvResult.score,
        display: Math.round((ltvResult.score / 10) * 10) / 10,
        patientClass: coreScore.patientClass,
        ltvMode: ltvResult.mode
      };
    }

    // Save to database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { error: updateError } = await supabase
      .from("clinic_visit_sessions")
      .update({
        score_aps: indicators.APS,
        score_dri: indicators.DRI,
        score_rvs: indicators.RVS,
        score_uri: indicators.URI,
        score_tsi: indicators.TSI,
        score_pqs: indicators.PQS,
        core_score_backend: finalScore.backend,
        core_score_display: finalScore.display,
        patient_class: finalScore.patientClass,
        scoring_mode: finalScore.ltvMode || "first_time",
        updated_at: new Date().toISOString()
      })
      .eq("id", sessionId)
      .eq("tenant_id", tenantId);

    if (updateError) {
      throw updateError;
    }

    return new Response(
      JSON.stringify({
        success: true,
        backend: finalScore.backend,
        display: finalScore.display,
        patientClass: finalScore.patientClass,
        ltvMode: finalScore.ltvMode || "first_time"
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
