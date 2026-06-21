// ============================================================
// Edge Function: auth-metadata-sync
// CORE SYSTEM v2.1 — P0 Security Critical
//
// Purpose:  Sync tenant_id and user_role into app_metadata on login
// Why:      app_metadata is server-readonly; user_metadata is user-writable
// Trigger:  Called from AuthProvider after successful email login
// Blueprint: get_current_tenant_id() reads from app_metadata
// ============================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SyncRequest {
  user_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "POST only" }), { 
      status: 405, 
      headers: corsHeaders 
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Get authenticated user from JWT
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "MISSING_TOKEN" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "UNAUTHORIZED: " + (userError?.message || "Invalid token") }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = user.id;

    // ── Step 1: Find user in clinic_users ──────────────────
    const { data: clinicUser, error: clinicError } = await supabase
      .from("clinic_users")
      .select("tenant_id, role, full_name, employee_code")
      .eq("id", userId)
      .is("deleted_at", null)
      .single();

    if (clinicError || !clinicUser) {
      return new Response(
        JSON.stringify({ error: "USER_NOT_FOUND: Not a clinic staff member" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 2: Verify tenant is active ────────────────────
    const { data: tenant, error: tenantError } = await supabase
      .from("master_tenants")
      .select("id, is_active, subscription_tier")
      .eq("id", clinicUser.tenant_id)
      .is("deleted_at", null)
      .single();

    if (tenantError || !tenant) {
      return new Response(
        JSON.stringify({ error: "TENANT_NOT_FOUND" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!tenant.is_active) {
      return new Response(
        JSON.stringify({ error: "TENANT_SUSPENDED" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 3: Update app_metadata (server-readonly) ──────
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      {
        app_metadata: {
          tenant_id: clinicUser.tenant_id,
          user_role: clinicUser.role,
          full_name: clinicUser.full_name,
          employee_code: clinicUser.employee_code,
          subscription_tier: tenant.subscription_tier,
          provider: "email",
          synced_at: new Date().toISOString(),
        },
      }
    );

    if (updateError) {
      console.error("Failed to update app_metadata:", updateError);
      return new Response(
        JSON.stringify({ error: "SYNC_FAILED: " + updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── Step 4: Return success ───────────────────────────────
    return new Response(
      JSON.stringify({
        success: true,
        tenant_id: clinicUser.tenant_id,
        user_role: clinicUser.role,
        subscription_tier: tenant.subscription_tier,
        message: "app_metadata synced successfully",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Auth metadata sync error:", error);
    return new Response(
      JSON.stringify({ error: "INTERNAL_ERROR: " + (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});