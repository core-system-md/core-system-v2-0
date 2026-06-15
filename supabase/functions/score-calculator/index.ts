// supabase/functions/score-calculator/index.ts
// On-demand: compute CORE Score for a session and write back to DB

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ScoreRequest {
  session_id: string;
  indicators: {
    aps: number;
    dri: number;
    rvs: number;
    uri: number;
    tsi: number;
    pqs: number;
  };
}

serve(async (req) => {
  const { session_id, indicators }: ScoreRequest = await req.json();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // Compute raw score
  const raw =
    indicators.aps * 0.28 +
    indicators.dri * 0.24 +
    indicators.rvs * 0.20 +
    indicators.uri * 0.15 +
    indicators.tsi * 0.13;

  // PQS penalty
  let penalty = 0;
  if (indicators.pqs >= 700) penalty = indicators.pqs * 0.20;
  else if (indicators.pqs >= 400) penalty = indicators.pqs * 0.10;

  const backend = Math.max(0, Math.min(1000, Math.round(raw - penalty)));
  const display = Math.round((backend / 10) * 10) / 10;

  // Patient classification
  let patientClass = 'low_priority';
  if (display >= 90) patientClass = 'hot_lead';
  else if (display >= 80) patientClass = 'qualified';
  else if (display >= 60) patientClass = 'high_priority';
  else if (display >= 40) patientClass = 'medium_priority';

  // Write to database
  const { error } = await supabase
    .from('clinic_visit_sessions')
    .update({
      score_aps: indicators.aps,
      score_dri: indicators.dri,
      score_tsi: indicators.tsi,
      score_uri: indicators.uri,
      score_pqs: indicators.pqs,
      score_rvs: indicators.rvs,
      core_score_backend: backend,
      core_score_display: display,
      patient_class: patientClass,
    })
    .eq('id', session_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ session_id, backend, display, patient_class: patientClass }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
