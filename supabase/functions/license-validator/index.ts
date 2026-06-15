// supabase/functions/license-validator/index.ts
// On-demand: validate device fingerprint + tenant license + max_devices

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

interface ValidateRequest {
  tenant_id: string;
  device_fingerprint: string;
  user_id: string;
}

serve(async (req) => {
  const { tenant_id, device_fingerprint, user_id }: ValidateRequest = await req.json();

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Check tenant exists and is active
  const { data: tenant, error: tenantError } = await supabase
    .from('master_tenants')
    .select('id, is_active, subscription_tier, max_devices')
    .eq('id', tenant_id)
    .single();

  if (tenantError || !tenant) {
    return new Response(JSON.stringify({ valid: false, reason: 'tenant_not_found' }), { status: 403 });
  }

  if (!tenant.is_active) {
    return new Response(JSON.stringify({ valid: false, reason: 'tenant_suspended' }), { status: 403 });
  }

  // 2. Check if device is already registered
  const { data: existingDevice } = await supabase
    .from('tenant_devices')
    .select('id, is_active')
    .eq('tenant_id', tenant_id)
    .eq('device_fingerprint', device_fingerprint)
    .single();

  if (existingDevice) {
    if (!existingDevice.is_active) {
      return new Response(JSON.stringify({ valid: false, reason: 'device_blocked' }), { status: 403 });
    }
    // Update last seen
    await supabase
      .from('tenant_devices')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', existingDevice.id);

    return new Response(JSON.stringify({ valid: true, device_id: existingDevice.id }), { status: 200 });
  }

  // 3. Check max_devices limit
  const { count: deviceCount, error: countError } = await supabase
    .from('tenant_devices')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)
    .eq('is_active', true);

  if (countError) {
    return new Response(JSON.stringify({ valid: false, reason: 'count_error' }), { status: 500 });
  }

  const maxDevices = tenant.max_devices || 2;
  if ((deviceCount || 0) >= maxDevices) {
    return new Response(JSON.stringify({ valid: false, reason: 'device_limit_reached', max: maxDevices }), { status: 403 });
  }

  // 4. Register new device
  const { data: newDevice, error: insertError } = await supabase
    .from('tenant_devices')
    .insert({
      tenant_id,
      user_id,
      device_fingerprint,
      device_name: 'Unknown Device',
      device_type: 'other',
      is_trusted: false,
      is_active: true,
      last_used_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (insertError) {
    return new Response(JSON.stringify({ valid: false, reason: 'insert_failed' }), { status: 500 });
  }

  return new Response(
    JSON.stringify({ valid: true, device_id: newDevice.id, registered: true }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  );
});
