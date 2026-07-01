// ============================================================
// CORE SYSTEM v2.1 — Supabase Client
// Constitution §1: Supabase (PostgreSQL + Edge Functions)
// Constitution §9.1: RLS ENABLED on ALL tables — NO exceptions.
// Constitution §9.5: JWT Claims — tenant_id + user_role injected.
// ============================================================

import { createClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('CORE SYSTEM: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env');
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    headers: {
      'X-Client-Info': 'core-system-v2.1',
    },
  },
});

// ── Typed RPC Helpers (Constitution §5: ALWAYS use database.types.ts) ──

/**
 * Validate clinic license key.
 * Returns tenant data if valid.
 */
export async function validateLicenseKey(licenseKey: string) {
  const { data, error } = await supabase
    .rpc('validate_license', { p_license_key: licenseKey });
  
  if (error) throw error;

  return data;
}

/**
 * Validate 4-digit PIN for kiosk fast-switch.
 * Constitution §9.6: PIN Auth — 4-digit PIN only.
 * 
 * RPC Signature (EXISTING — DO NOT MODIFY):
 * validate_pin(tenant_id text, pin text)
 * RETURNS TABLE(id uuid, full_name text, role text, tenant_id uuid)
 */
export async function validatePin(tenantId: string, pinCode: string) {
  const { data, error } = await supabase
    .rpc('validate_pin', {
      p_tenant_id: tenantId,
      p_pin: pinCode,
    });

  if (error) throw error;
  
  if (!data || (Array.isArray(data) && data.length === 0)) {
    throw new Error('INVALID_PIN');
  }

  const user = Array.isArray(data) ? data[0] : data;
  return ({ ...user, tenant_id: tenantId } as {
    id: string;
    full_name: string;
    role: 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';
    tenant_id: string;
  });
}

/**
 * Log PIN attempt for rate limiting.
 */
export async function logPinAttempt(
  tenantId: string, 
  pinCode: string, 
  success: boolean,
  ipAddress?: string
) {
  const { error } = await supabase
    .from('pin_attempt_log')
    .insert({
      tenant_id: tenantId,
      attempted_pin: pinCode,
      success,
      ip_address: ipAddress,
      created_at: new Date().toISOString(),
    });

  if (error) console.error('Failed to log PIN attempt:', error);
}

// ── Session Helpers ──

export async function getCurrentSession() {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
}

export async function refreshSession() {
  const { data, error } = await supabase.auth.refreshSession();
  if (error) throw error;
  return data.session;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
