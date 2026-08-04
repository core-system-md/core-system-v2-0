import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

Deno.serve(async (req) => {
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${CRON_SECRET}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const today = new Date().toISOString().split('T')[0];

  const { data: tenants, error: tenantError } = await supabase
    .from('master_tenants')
    .select('id')
    .eq('is_active', true);

  if (tenantError || !tenants) {
    return new Response(JSON.stringify({ error: tenantError?.message }), { status: 500 });
  }

  const results = [];
  for (const tenant of tenants) {
    const { data: stats, error: statsError } = await supabase.rpc('compute_daily_snapshot', {
      p_tenant_id: tenant.id,
      p_date: today
    });

    if (statsError) {
      results.push({ tenant_id: tenant.id, error: statsError.message, stored: false });
      continue;
    }

    // ═══════════════════════════════════════════════════════════════
    // P37-A FIX: Persist computed snapshot to analytics_daily_snapshots
    // ═══════════════════════════════════════════════════════════════
    const snapshot = (stats ?? {}) as Record<string, unknown>;
    const { error: upsertError } = await supabase
      .from('analytics_daily_snapshots')
      .upsert({
        tenant_id: tenant.id,
        snapshot_date: today,
        total_visits: (snapshot.total_visits as number | undefined) ?? null,
        total_revenue_subunits: (snapshot.total_revenue_subunits as number | undefined) ?? null,
        total_discounts_subunits: (snapshot.total_discounts_subunits as number | undefined) ?? null,
        avg_wait_time_minutes: (snapshot.avg_wait_time_minutes as number | undefined) ?? null,
        avg_session_duration_minutes: (snapshot.avg_session_duration_minutes as number | undefined) ?? null,
        avg_core_score: (snapshot.avg_core_score as number | undefined) ?? null,
        conversion_rate: (snapshot.conversion_rate as number | undefined) ?? null,
        hot_leads_count: (snapshot.hot_leads_count as number | undefined) ?? null,
        sla_breaches_count: (snapshot.sla_breaches_count as number | undefined) ?? null,
        total_new_patients: (snapshot.total_new_patients as number | undefined) ?? null,
        total_returning_patients: (snapshot.total_returning_patients as number | undefined) ?? null,
        total_cancellations: (snapshot.total_cancellations as number | undefined) ?? null,
        total_no_shows: (snapshot.total_no_shows as number | undefined) ?? null,
        snapshot_metadata: snapshot,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'tenant_id,snapshot_date'
      });

    results.push({
      tenant_id: tenant.id,
      snapshot: stats,
      stored: !upsertError,
      ...(upsertError ? { store_error: upsertError.message } : {})
    });
  }

  return new Response(JSON.stringify({
    success: true,
    date: today,
    tenants_processed: results.length,
    results
  }), { status: 200 });
});