import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), { status: 405 });
  }

  const { session_id, indicators } = await req.json();

  if (!session_id || !indicators) {
    return new Response(JSON.stringify({ error: 'session_id and indicators required' }), { status: 400 });
  }

  const { data: rules } = await supabase
    .from('core_rules_config')
    .select('rule_value')
    .eq('rule_key', 'weights')
    .is('tenant_id', null)
    .single();

  const weights = rules?.rule_value || { APS: 0.28, DRI: 0.24, RVS: 0.20, URI: 0.15, TSI: 0.13 };

  const raw =
    (indicators.APS || 0) * weights.APS +
    (indicators.DRI || 0) * weights.DRI +
    (indicators.RVS || 0) * weights.RVS +
    (indicators.URI || 0) * weights.URI +
    (indicators.TSI || 0) * weights.TSI;

  const pqs = indicators.PQS || 0;
  let penalty = 0;
  if (pqs >= 700) penalty = pqs * 0.20;
  else if (pqs >= 400) penalty = pqs * 0.10;

  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  const display = Math.round(backend / 10.0 * 10) / 10;

  let patientClass = 'low_priority';
  if (display >= 90) patientClass = 'hot_lead';
  else if (display >= 80) patientClass = 'qualified';
  else if (display >= 60) patientClass = 'high_priority';
  else if (display >= 40) patientClass = 'medium_priority';

  const { error } = await supabase
    .from('clinic_visit_sessions')
    .update({
      score_aps: indicators.APS,
      score_dri: indicators.DRI,
      score_tsi: indicators.TSI,
      score_uri: indicators.URI,
      score_pqs: indicators.PQS,
      score_rvs: indicators.RVS,
      core_score_backend: backend,
      core_score_display: display,
      patient_class: patientClass,
      updated_at: new Date().toISOString()
    })
    .eq('id', session_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify({
    success: true,
    session_id,
    backend,
    display,
    patient_class: patientClass,
    weights_used: weights
  }), { status: 200 });
});
