// src/core/auth/useAuth.ts
// Blueprint: src/core/auth/useAuth.ts
// Purpose: Email + PIN + License validation
// FIXED: 2026-07-01 — Sync login/logout with authStore (Zustand single source of truth)
// FIXED: 2026-07-01 — Handle SETOF responses (array of rows) from RPCs
// FIXED: 2026-07-01 — Validate tenant_id before saving to localStorage
// FIXED: 2026-07-02 — Add DEV MODE to bypass license validation for rapid development

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import type { UserRole } from '@/shared/types/auth';

// ─── Types ───
interface LoginCredentials {
  email?: string;
  password?: string;
  pinCode?: string;
  licenseKey: string;
  role?: string;
}

interface LoginResult {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  tenantId: string;
}

// ─── Helpers for SETOF responses ───
function parseSetofResponse<T>(response: unknown): T | null {
  if (Array.isArray(response) && response.length > 0) {
    return response[0] as T;
  }
  if (response && typeof response === 'object') {
    return response as T;
  }
  return null;
}

// ─── Validate tenant_id ───
function isValidTenantId(tenantId: unknown): tenantId is string {
  if (!tenantId) return false;
  const str = String(tenantId).trim();
  return str !== '' && str !== 'null' && str !== 'undefined';
}

// ─── Validate UUID format ───
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ─── DEV MODE: Bypass license validation ───
const DEV_MODE = import.meta.env.DEV;
const DEV_TENANT_ID = '00000000-0000-0000-0000-000000000001';
const DEV_LICENSE_KEY = 'DEV-MODE-2026';

const PIN_AUTH_KEY = 'core_pin_auth';
const PIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function useAuth() {
  // ── Zustand Store hooks ──
  const storeSetUser = useAuthStore((s) => s.setUser);
  const storeSetAuthenticated = useAuthStore((s) => s.setAuthenticated);
  const storeSetStatus = useAuthStore((s) => s.setStatus);
  const storeSetTenant = useAuthStore((s) => s.setTenant);
  const storeLogout = useAuthStore((s) => s.logout);
  const storeUser = useAuthStore((s) => s.user);
  const storeIsAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const storeTenantId = useAuthStore((s) => s.tenant_id);

  const login = useMutation<LoginResult, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const {
        licenseKey,
        email: loginEmail,
        password,
        pinCode,
        role,
      } = credentials;

      // ── DEV MODE: Skip license validation ──
      if (DEV_MODE && licenseKey === DEV_LICENSE_KEY) {
        const tenantId = DEV_TENANT_ID;
        
        // PIN Login in DEV MODE
        if (pinCode?.trim()) {
          if (!role?.trim()) {
            throw new Error('ROLE_REQUIRED: Role is required for PIN login');
          }
          
          const result: LoginResult = {
            userId: 'dev-user-' + role,
            email: null,
            fullName: 'Dev ' + role,
            role: role,
            tenantId,
          };

          localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
            user_id: result.userId,
            full_name: result.fullName,
            role: result.role,
            tenant_id: result.tenantId,
            expiry: Date.now() + PIN_SESSION_DURATION_MS,
          }));
          localStorage.setItem('tenant_id', result.tenantId);

          storeSetTenant(result.tenantId, null);
          storeSetUser({
            id: result.userId,
            full_name: result.fullName,
            role: result.role as UserRole,
            tenant_id: result.tenantId,
          });
          storeSetAuthenticated(true);
          storeSetStatus('authenticated');

          return result;
        }

        throw new Error('CREDENTIALS_REQUIRED: Provide PIN in DEV mode');
      }

      // ── PRODUCTION MODE: Normal license validation ──
      if (!licenseKey?.trim()) {
        throw new Error('LICENSE_REQUIRED: Clinic license key is required');
      }

      // 1. Validate the license and obtain the trusted tenant ID.
      const { data: licenseResult, error: licenseError } = await supabase.rpc(
        'validate_license',
        { p_license_key: licenseKey.trim() },
      );

      if (licenseError) {
        throw new Error(`INVALID_LICENSE: ${licenseError.message}`);
      }

      // SETOF returns array of rows
      const licenseData = parseSetofResponse<any>(licenseResult);
      if (!licenseData) {
        throw new Error('INVALID_LICENSE: License not found or inactive');
      }

      // ✅ Validate that id exists
      if (!licenseData.id) {
        throw new Error('INVALID_LICENSE: License data missing ID field');
      }

      const tenantId = String(licenseData.id);

      if (!isValidTenantId(tenantId)) {
        throw new Error('TENANT_MISSING: Tenant ID was not returned by license validation');
      }

      if (!isValidUUID(tenantId)) {
        throw new Error(`TENANT_INVALID: Tenant ID format invalid: ${tenantId}`);
      }

      // 2. Email + Password Login
      if (loginEmail?.trim() && password) {
        const { data: authResult, error: validateError } = await supabase.rpc(
          'validate_email_password',
          { p_email: loginEmail.trim(), p_password: password, p_tenant_id: tenantId },
        );

        if (validateError) {
          throw new Error(`AUTH_FAILED: ${validateError.message}`);
        }

        const authData = parseSetofResponse<any>(authResult);

        if (!authData) {
          throw new Error(`AUTH_FAILED: Invalid email or password`);
        }

        const result: LoginResult = {
          userId: String(authData.id),
          email: loginEmail.trim(),
          fullName: authData.full_name ?? null,
          role: authData.role ?? null,
          tenantId,
        };

        // ✅ Write to core_pin_auth (new format)
        localStorage.setItem(
          PIN_AUTH_KEY,
          JSON.stringify({
            user_id: result.userId,
            full_name: result.fullName,
            role: result.role,
            tenant_id: result.tenantId,
            expiry: Date.now() + PIN_SESSION_DURATION_MS,
          }),
        );

        // ✅ Write tenant_id directly for backward compatibility
        localStorage.setItem('tenant_id', result.tenantId);

        // ✅ Sync to Zustand
        storeSetTenant(result.tenantId, null);
        storeSetUser({
          id: result.userId,
          full_name: result.fullName || 'User',
          role: (result.role || 'receptionist') as UserRole,
          tenant_id: result.tenantId,
          email: result.email || undefined,
        });
        storeSetAuthenticated(true);
        storeSetStatus('authenticated');

        return result;
      }

      // 3. PIN Login
      if (pinCode?.trim()) {
        if (!role?.trim()) {
          throw new Error('ROLE_REQUIRED: Role is required for PIN login (doctor, receptionist, clinic_admin, super_admin)');
        }

        const { data: pinResult, error: pinError } = await supabase.rpc(
          'validate_pin',
          { p_tenant_id: tenantId, p_pin: pinCode.trim(), p_role: role.trim() },
        );

        if (pinError) {
          throw new Error(`INVALID_PIN: ${pinError.message}`);
        }

        // SETOF returns array of rows
        const pinData = parseSetofResponse<any>(pinResult);
        if (!pinData) {
          throw new Error('INVALID_PIN: Incorrect PIN code');
        }

        const result: LoginResult = {
          userId: String(pinData.id),
          email: null,
          fullName: pinData.full_name ?? null,
          role: pinData.role ?? null,
          tenantId,
        };

        // ✅ Write to core_pin_auth (new format)
        localStorage.setItem(
          PIN_AUTH_KEY,
          JSON.stringify({
            user_id: result.userId,
            full_name: result.fullName,
            role: result.role,
            tenant_id: result.tenantId,
            expiry: Date.now() + PIN_SESSION_DURATION_MS,
          }),
        );

        // ✅ Write tenant_id directly for backward compatibility
        localStorage.setItem('tenant_id', result.tenantId);

        // ✅ Sync to Zustand
        storeSetTenant(result.tenantId, null);
        storeSetUser({
          id: result.userId,
          full_name: result.fullName || 'Staff User',
          role: (result.role || 'receptionist') as UserRole,
          tenant_id: result.tenantId,
        });
        storeSetAuthenticated(true);
        storeSetStatus('authenticated');

        return result;
      }

      throw new Error('CREDENTIALS_REQUIRED: Provide email+password or PIN');
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const validateLicense = async (licenseKey: string): Promise<{ success: boolean; tenant_id?: string; message?: string }> => {
    setStatus('loading');
    setError(null);
    
    // ── DEV MODE: Skip validation ──
    if (DEV_MODE && licenseKey === DEV_LICENSE_KEY) {
      localStorage.setItem('tenant_id', DEV_TENANT_ID);
      storeSetTenant(DEV_TENANT_ID, null);
      storeSetStatus('license_valid');
      setStatus('success');
      return { success: true, tenant_id: DEV_TENANT_ID };
    }
    
    try {
      const { data: licenseResult, error: licenseError } = await supabase.rpc(
        'validate_license',
        { p_license_key: licenseKey.trim() },
      );
      if (licenseError) {
        setStatus('error');
        setError(licenseError.message);
        return { success: false, message: licenseError.message };
      }
      // SETOF returns array of rows
      const licenseData = parseSetofResponse<any>(licenseResult);
      if (!licenseData) {
        const msg = 'License not found or inactive';
        setStatus('error');
        setError(msg);
        return { success: false, message: msg };
      }
      
      // ✅ Validate that id exists
      if (!licenseData.id) {
        const msg = 'License data missing ID field';
        setStatus('error');
        setError(msg);
        return { success: false, message: msg };
      }
      
      const tenantId = String(licenseData.id);
      if (!isValidTenantId(tenantId)) {
        const msg = 'Invalid tenant ID returned';
        setStatus('error');
        setError(msg);
        return { success: false, message: msg };
      }
      
      if (!isValidUUID(tenantId)) {
        const msg = `Tenant ID format invalid: ${tenantId}`;
        setStatus('error');
        setError(msg);
        return { success: false, message: msg };
      }
      
      localStorage.setItem('tenant_id', tenantId);
      // ✅ Sync to Zustand
      storeSetTenant(tenantId, null);
      storeSetStatus('license_valid');
      setStatus('success');
      return { success: true, tenant_id: tenantId };
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || String(err));
      return { success: false, message: err?.message };
    }
  };

  const loginWithPin = async (pin: string, role?: string) : Promise<{ success: boolean; user?: { role?: string; id?: string; fullName?: string }; error?: string }> => {
    setStatus('loading');
    setError(null);
    try {
      const tenantId = localStorage.getItem('tenant_id');
      if (!isValidTenantId(tenantId)) {
        const msg = 'TENANT_NOT_AVAILABLE';
        setStatus('error');
        setError(msg);
        return { success: false, error: msg };
      }
      const { data: pinResult, error: pinError } = await supabase.rpc('validate_pin', { p_tenant_id: tenantId!, p_pin: pin.trim(), p_role: role ?? null });
      if (pinError) {
        setStatus('error');
        setError(pinError.message);
        return { success: false, error: pinError.message };
      }
      // SETOF returns array of rows
      const pinData = parseSetofResponse<any>(pinResult);
      if (!pinData) {
        const msg = 'Invalid PIN';
        setStatus('error');
        setError(msg);
        return { success: false, error: msg };
      }
      // Persist PIN auth
      localStorage.setItem('core_pin_auth', JSON.stringify({ 
        user_id: String(pinData.id), 
        full_name: pinData.full_name ?? null, 
        role: pinData.role ?? null, 
        tenant_id: tenantId, 
        expiry: Date.now() + (24 * 60 * 60 * 1000) 
      }));
      // ✅ Sync to Zustand
      storeSetTenant(tenantId, null);
      storeSetUser({
        id: String(pinData.id),
        full_name: pinData.full_name || 'Staff User',
        role: (pinData.role || 'receptionist') as UserRole,
        tenant_id: tenantId!,
      });
      storeSetAuthenticated(true);
      storeSetStatus('authenticated');
      setStatus('success');
      const userObj: any = { id: String(pinData.id) };
      if (pinData.role) userObj.role = pinData.role;
      if (pinData.full_name) userObj.fullName = pinData.full_name;
      return { success: true, user: userObj };
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || String(err));
      return { success: false, error: err?.message };
    }
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch { /* ignore */ }
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('core_pin_auth');
    // ✅ Clear Zustand
    storeLogout();
  };

  const clearError = () => setError(null);

  return {
    login,
    isPending: login.isPending,
    isLoading: login.isPending,
    user: storeUser,
    isAuthenticated: storeIsAuthenticated,
    validateLicense,
    loginWithPin,
    logout,
    error,
    status,
    tenant_id: storeTenantId,
    clearError,
  };
}
