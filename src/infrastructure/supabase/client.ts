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

export async function getCurrentUserWithClaims() {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return null;
  
  return {
    id: user.id,
    email: user.email,
    role: user.app_metadata?.user_role || null,
    tenantId: user.app_metadata?.tenant_id || null,
    fullName: user.app_metadata?.full_name || null,
  };
}
