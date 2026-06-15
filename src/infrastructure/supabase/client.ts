// Supabase client init with JWT claims injection

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('MISSING_SUPABASE_ENV: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are required');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

/**
 * Get current user with JWT claims from user_metadata
 */
export async function getCurrentUserWithClaims() {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  if (sessionError || !session) return null;

  const { user } = session;
  if (!user) return null;

  const metadata = user.user_metadata || {};

  return {
    id: user.id,
    email: user.email,
    tenantId: metadata.tenant_id as string | undefined,
    role: metadata.user_role as string | undefined,
    fullName: metadata.full_name as string | undefined,
  };
}

/**
 * Debug helper: Verify JWT contains tenant_id
 */
export async function verifyJwtClaims() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const token = session.access_token || ''; const parts = token.split('.'); const payload = parts[1] ? JSON.parse(atob(parts[1])) : {};

  return {
    hasTenantId: !!payload.user_metadata?.tenant_id,
    hasRole: !!payload.user_metadata?.user_role,
    tenantId: payload.user_metadata?.tenant_id,
    role: payload.user_metadata?.user_role,
    rawMetadata: payload.user_metadata,
  };
}
