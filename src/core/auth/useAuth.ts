// src/core/auth/useAuth.ts
// FIXED: 2026-07-02 — Add DEV MODE, fix null handling, handle SETOF responses

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';
import type { UserRole } from '@/shared/types/auth';

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

function parseSetofResponse<T>(response: unknown): T | null {
  if (Array.isArray(response) && response.length > 0) {
    return response[0] as T;
  }
  if (response && typeof response === 'object') {
    return response as T;
  }
  return null;
}

function isValidTenantId(tenantId: unknown): tenantId is string {
  if (!tenantId) return false;
  const str = String(tenantId).trim();
  return str !== '' && str !== 'null' && str !== 'undefined';
}

function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const DEV_MODE = import.meta.env.DEV;
const DEV_TENANT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const DEV_LICENSE_KEY = 'DEV-MODE-2026';
const PIN_AUTH_KEY = 'core_pin_auth';
const PIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function useAuth() {
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
      const { licenseKey, email: loginEmail, password, pinCode, role } = credentials;

      // ── DEV MODE ──
      if (DEV_MODE && licenseKey === DEV_LICENSE_KEY) {
        const tenantId = DEV_TENANT_ID;
        if (pinCode?.trim()) {
          if (!role?.trim()) throw new Error('ROLE_REQUIRED');
          const result: LoginResult = {
            userId: 'dev-user-' + role,
            email: null,
            fullName: 'Dev ' + role,
            role: role,
            tenantId,
          };
          localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
            user_id: result.userId,
            full_name: result.fullName || 'Dev User',
            role: result.role,
            tenant_id: result.tenantId,
            expiry: Date.now() + PIN_SESSION_DURATION_MS,
          }));
          console.info('[useAuth] set tenant_id (DEV):', DEV_TENANT_ID);
          localStorage.setItem('tenant_id', result.tenantId);
          storeSetTenant(result.tenantId, null);
          storeSetUser({
            id: result.userId,
            full_name: result.fullName || 'Dev User',
            role: result.role as UserRole,
            tenant_id: result.tenantId,
          });
          storeSetAuthenticated(true);
          storeSetStatus('authenticated');
          return result;
        }
        throw new Error('CREDENTIALS_REQUIRED: Provide PIN in DEV mode');
      }

      // ── PRODUCTION ──
      if (!licenseKey?.trim()) {
        throw new Error('LICENSE_REQUIRED');
      }

      const { data: licenseResult, error: licenseError } = await supabase.rpc(
        'validate_license',
        { p_license_key: licenseKey.trim() },
      );
      if (licenseError) throw new Error(`INVALID_LICENSE: ${licenseError.message}`);

      const licenseData = parseSetofResponse<any>(licenseResult);
      if (!licenseData) throw new Error('INVALID_LICENSE: License not found');
      if (!licenseData.id) throw new Error('INVALID_LICENSE: Missing ID field');

      const tenantId = String(licenseData.id);
      if (!isValidTenantId(tenantId)) throw new Error('TENANT_MISSING');
      if (!isValidUUID(tenantId)) throw new Error(`TENANT_INVALID: ${tenantId}`);

      // Email + Password
      if (loginEmail?.trim() && password) {
        const { data: authResult, error: validateError } = await supabase.rpc(
          'validate_email_password',
          { p_email: loginEmail.trim(), p_password: password, p_tenant_id: tenantId },
        );
        if (validateError) throw new Error(`AUTH_FAILED: ${validateError.message}`);
        const authData = parseSetofResponse<any>(authResult);
        if (!authData) throw new Error('AUTH_FAILED: Invalid credentials');

        const result: LoginResult = {
          userId: String(authData.id),
          email: loginEmail.trim(),
          fullName: authData.full_name ?? null,
          role: authData.role ?? null,
          tenantId,
        };

        localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
          user_id: result.userId,
          full_name: result.fullName || 'User',
          role: result.role,
          tenant_id: result.tenantId,
          expiry: Date.now() + PIN_SESSION_DURATION_MS,
        }));
          console.info('[useAuth] set core_pin_auth (email login):', result.userId, result.tenantId);
          localStorage.setItem('tenant_id', result.tenantId);
          console.info('[useAuth] set tenant_id (email login):', result.tenantId);

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

      // PIN Login
      if (pinCode?.trim()) {
        if (!role?.trim()) throw new Error('ROLE_REQUIRED');
        const { data: pinResult, error: pinError } = await supabase.rpc(
          'validate_pin',
          { p_tenant_id: tenantId, p_pin: pinCode.trim(), p_role: role.trim() },
        );
        if (pinError) throw new Error(`INVALID_PIN: ${pinError.message}`);
        const pinData = parseSetofResponse<any>(pinResult);
        if (!pinData) throw new Error('INVALID_PIN: Incorrect PIN');

        const result: LoginResult = {
          userId: String(pinData.id),
          email: null,
          fullName: pinData.full_name ?? null,
          role: pinData.role ?? null,
          tenantId,
        };

        localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
          user_id: result.userId,
          full_name: result.fullName || 'Staff User',
          role: result.role,
          tenant_id: result.tenantId,
          expiry: Date.now() + PIN_SESSION_DURATION_MS,
        }));
          console.info('[useAuth] set core_pin_auth (pin login):', result.userId, result.tenantId);
          localStorage.setItem('tenant_id', result.tenantId);
          console.info('[useAuth] set tenant_id (pin login):', result.tenantId);

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

      throw new Error('CREDENTIALS_REQUIRED');
    },
  });

  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const validateLicense = async (licenseKey: string): Promise<{ success: boolean; tenant_id?: string; message?: string }> => {
    setStatus('loading');
    setError(null);
    
    if (licenseKey === DEV_LICENSE_KEY) {
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
      const licenseData = parseSetofResponse<any>(licenseResult);
      if (!licenseData) {
        const msg = 'License not found';
        setStatus('error'); setError(msg);
        return { success: false, message: msg };
      }
      if (!licenseData.id) {
        const msg = 'License missing ID';
        setStatus('error'); setError(msg);
        return { success: false, message: msg };
      }
      const tenantId = String(licenseData.id);
      if (!isValidTenantId(tenantId)) {
        const msg = 'Invalid tenant ID';
        setStatus('error'); setError(msg);
        return { success: false, message: msg };
      }
      if (!isValidUUID(tenantId)) {
        const msg = `Invalid UUID: ${tenantId}`;
        setStatus('error'); setError(msg);
        return { success: false, message: msg };
      }
      localStorage.setItem('tenant_id', tenantId);
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

  const loginWithPin = async (pin: string, _role?: string): Promise<{ success: boolean; user?: any; error?: string }> => {
    setStatus('loading');
    setError(null);
    try {
      const tenantId = localStorage.getItem('tenant_id');
      if (!isValidTenantId(tenantId)) {
        const msg = 'TENANT_NOT_AVAILABLE';
        setStatus('error'); setError(msg);
        return { success: false, error: msg };
      }
      const { data: pinResult, error: pinError } = await supabase.rpc(
        'validate_pin',
        { p_tenant_id: tenantId!, p_pin: pin.trim() }
      );
      if (pinError) {
        setStatus('error'); setError(pinError.message);
        return { success: false, error: pinError.message };
      }
      const pinData = parseSetofResponse<any>(pinResult);
      if (!pinData) {
        const msg = 'Invalid PIN';
        setStatus('error'); setError(msg);
        return { success: false, error: msg };
      }
      localStorage.setItem('core_pin_auth', JSON.stringify({
        user_id: String(pinData.id),
        full_name: pinData.full_name ?? null,
        role: pinData.role ?? null,
        tenant_id: tenantId,
        expiry: Date.now() + (24 * 60 * 60 * 1000),
      }));
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
    try { await supabase.auth.signOut(); } catch { /* ignore */ }
    localStorage.removeItem('tenant_id');
    localStorage.removeItem('core_pin_auth');
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
