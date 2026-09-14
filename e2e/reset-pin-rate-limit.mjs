import { createClient } from '@supabase/supabase-js';

for (const key of ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'E2E_TENANT_ID']) {
  if (!process.env[key]) throw new Error(`[E2E] Missing required environment variable: ${key}`);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

export async function resetPinRateLimit() {
  const resetAt = new Date(Date.now() - 16 * 60 * 1000).toISOString();
  const { error } = await supabase
    .from('pin_attempt_log')
    .update({ created_at: resetAt, updated_at: resetAt })
    .eq('tenant_id', process.env.E2E_TENANT_ID);

  if (error) throw new Error(`[E2E] PIN rate-limit reset failed: ${error.message}`);
}
