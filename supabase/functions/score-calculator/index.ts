// ============================================================
// CORE SYSTEM v2.1 — Edge Function: score-calculator
// CONSTITUTION §4: Core Score Formula MUST be in Backend
// NO frontend score calculation allowed
// ============================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const WEIGHTS = {
  APS: 0.28,
  DRI: 0.24,
  RVS: 0.20,
  URI: 0.15,
  TSI: 0.13,
} as const;

const ALLOWED_ROLES = new Set(["doctor", "clinic_admin", "super_admin"]);

type Indicators = {
  APS: number;
  DRI: number;
  RVS: number;
  URI: number;
  TSI: number;
  PQS: number;
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function getPatientClass(display: number): string {
  if (display >= 90) return "hot_lead";
  if (display >= 80) return "qualified";
  if (display >= 60) return "high_priority";
  if (display >= 40) return "medium_priority";
  return "low_priority";
}

function validateIndicators(value: unknown): Indicators {
  if (!value || typeof value !== "object") throw new Error("Invalid indicators");
  const source = value as Record<string, unknown>;
  const indicators = {
    APS: Number(source.APS ?? source.aps),
    DRI: Number(source.DRI ?? source.dri),
    RVS: Number(source.RVS ?? source.rvs),
    URI: Number(source.URI ?? source.uri),
    TSI: Number(source.TSI ?? source.tsi),
    PQS: Number(source.PQS ?? source.pqs),
  };
  for (const [key, item] of Object.entries(indicators)) {
    if (!Number.isInteger(item) || item < 0 || item > 1000) {
      throw new Error(`${key} must be an integer between 0 and 1000`);
    }
  }
  return indicators;
}

function computeCoreScore(indicators: Indicators) {
  const raw =
    indicators.APS * WEIGHTS.APS +
    indicators.DRI * WEIGHTS.DRI +
    indicators.RVS * WEIGHTS.RVS +
    indicators.URI * WEIGHTS.URI +
    indicators.TSI * WEIGHTS.TSI;
  const penalty =
    indicators.PQS >= 700
      ? indicators.PQS * 0.20
      : indicators.PQS >= 400
        ? indicators.PQS * 0.10
        : 0;
  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  const display = Math.round((backend / 10) * 10) / 10;
  return { raw, penalty, backend, display };
}

function computeWeightedScore(
  historicalAvg: number | null,
  sessionScore: number,
  lastVisitDate: string | null,
) {
  if (historicalAvg === null || !lastVisitDate) {
    return { score: sessionScore, mode: "first_time" as const };
  }
  const monthsAbsent =
    (Date.now() - new Date(lastVisitDate).getTime()) /
    (1000 * 60 * 60 * 24 * 30);
  if (!Number.isFinite(monthsAbsent) || monthsAbsent > 18) {
    return { score: sessionScore, mode: "first_time" as const };
  }
  return {
    score: Math.max(0, Math.min(1000, Math.round(historicalAvg * 0.60 + sessionScore * 0.40))),
    mode: "weighted_ltv" as const,
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!token) return json({ error: "UNAUTHORIZED" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) return json({ error: "SERVER_CONFIGURATION_ERROR" }, 500);

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "UNAUTHORIZED" }, 401);

    const body = await req.json();
    const sessionId = String(body.sessionId ?? body.session_id ?? "").trim();
    const suppliedTenantId = String(body.tenantId ?? body.tenant_id ?? "").trim();
    const indicators = validateIndicators(body.indicators);
    if (!sessionId) return json({ error: "Missing required field: sessionId" }, 400);
    if (suppliedTenantId && !/^[0-9a-fA-F-]{36}$/.test(suppliedTenantId)) {
      return json({ error: "Invalid tenantId" }, 400);
    }

    const { data: clinicUser, error: clinicUserError } = await supabase
      .from("clinic_users")
      .select("id, tenant_id, role, is_active")
      .eq("id", user.id)
      .is("deleted_at", null)
      .single();
    if (clinicUserError || !clinicUser || !clinicUser.is_active || !ALLOWED_ROLES.has(clinicUser.role)) {
      return json({ error: "FORBIDDEN" }, 403);
    }
    if (suppliedTenantId && suppliedTenantId !== clinicUser.tenant_id) {
      return json({ error: "TENANT_MISMATCH" }, 403);
    }

    const { data: tenant, error: tenantError } = await supabase
      .from("master_tenants")
      .select("id, is_active")
      .eq("id", clinicUser.tenant_id)
      .is("deleted_at", null)
      .single();
    if (tenantError || !tenant || !tenant.is_active) return json({ error: "TENANT_SUSPENDED" }, 403);

    const { data: session, error: sessionError } = await supabase
      .from("clinic_visit_sessions")
      .select("id, tenant_id, patient_id, doctor_id")
      .eq("id", sessionId)
      .is("deleted_at", null)
      .single();
    if (sessionError || !session) return json({ error: "SESSION_NOT_FOUND" }, 404);
    if (session.tenant_id !== clinicUser.tenant_id) return json({ error: "TENANT_MISMATCH" }, 403);
    if (clinicUser.role === "doctor" && session.doctor_id !== clinicUser.id) return json({ error: "FORBIDDEN" }, 403);

    const { data: longitudinal, error: longitudinalError } = await supabase
      .from("patient_longitudinal_profiles")
      .select("historical_core_score_avg, last_visit_date")
      .eq("patient_id", session.patient_id)
      .eq("tenant_id", clinicUser.tenant_id)
      .single();
    if (longitudinalError && longitudinalError.code !== "PGRST116") throw longitudinalError;

    const core = computeCoreScore(indicators);
    const ltv = computeWeightedScore(
      longitudinal?.historical_core_score_avg ?? null,
      core.backend,
      longitudinal?.last_visit_date ?? null,
    );
    const finalDisplay = Math.round((ltv.score / 10) * 10) / 10;
    const patientClass = getPatientClass(finalDisplay);

    const { error: updateError } = await supabase
      .from("clinic_visit_sessions")
      .update({
        score_aps: indicators.APS,
        score_dri: indicators.DRI,
        score_rvs: indicators.RVS,
        score_uri: indicators.URI,
        score_tsi: indicators.TSI,
        score_pqs: indicators.PQS,
        core_score_backend: ltv.score,
        core_score_display: finalDisplay,
        patient_class: patientClass,
        scoring_mode: ltv.mode,
        updated_at: new Date().toISOString(),
      })
      .eq("id", sessionId)
      .eq("tenant_id", clinicUser.tenant_id)
      .is("deleted_at", null);
    if (updateError) throw updateError;

    return json({
      success: true,
      session_id: sessionId,
      backend: ltv.score,
      display: finalDisplay,
      patientClass,
      patient_class: patientClass,
      ltvMode: ltv.mode,
      ltv_mode: ltv.mode,
    });
  } catch (error) {
    console.error("score-calculator error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});