// src/core/auth/useAuth.ts
// Blueprint: src/core/auth/useAuth.ts
// Purpose: Email + PIN + License validation
// UPDATED: 2026-06-24 — Fixed validate_license/validate_pin jsonb response + backward compatibility for tenant_id

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { supabase } from '../../infrastructure/supabase/client';

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

interface RpcResponse {
  success?: boolean;
  message?: string;
  tenant_id?: unknown;
  user_id?: unknown;
  full_name?: string | null;
  role?: string | null;
  employee_code?: string | null;
}

function parseRpcResponse<T extends RpcResponse>(response: unknown): T | null {
  if (response && typeof response === 'object') {
    const payload = response as { data?: unknown };
    if (payload.data !== undefined) return payload.data as T;
    return response as T;
  }
  if (Array.isArray(response) && response.length > 0) {
    return response[0] as T;
  }
  return null;
}

const PIN_AUTH_KEY = 'core_pin_auth';
const PIN_SESSION_DURATION_MS = 24 * 60 * 60 * 1000;

export function useAuth() {
  const login = useMutation<LoginResult, Error, LoginCredentials>({
    mutationFn: async (credentials) => {
      const {
        licenseKey,
        email: loginEmail,
        password,
        pinCode,
        role,
      } = credentials;

      if (!licenseKey?.trim()) {
        throw new Error('LICENSE_REQUIRED: Clinic license key is required');
      }

      // 1. Validate the license and obtain the trusted tenant ID.
      const { data: licenseResult, error: licenseError } = await supabase.rpc(
        'validate_license',
        { p_license_key: licenseKey.trim(), p_device_fingerprint: null },
      );

      if (licenseError) {
        throw new Error(`INVALID_LICENSE: ${licenseError.message}`);
      }

      const licenseData = parseRpcResponse<RpcResponse>(licenseResult);
      if (!licenseData) {
        throw new Error('INVALID_LICENSE: Unexpected response format');
      }

      if (!licenseData?.success) {
        throw new Error(`INVALID_LICENSE: ${licenseData?.message || 'License validation failed'}`);
      }

      const tenantId = String(licenseData.tenant_id);

      if (!tenantId || tenantId === 'null' || tenantId === 'undefined' || tenantId === '') {
        throw new Error('TENANT_MISSING: Tenant ID was not returned by license validation');
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

        const authData = parseRpcResponse<RpcResponse>(authResult);

        if (!authData?.success) {
          throw new Error(`AUTH_FAILED: ${authData?.message || 'Invalid email or password'}`);
        }

        const result: LoginResult = {
          userId: String(authData.user_id),
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

        // ✅ Write tenant_id directly for backward compatibility (DecisionCard.tsx, etc.)
        localStorage.setItem('tenant_id', result.tenantId);

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

        const pinData = parseRpcResponse<RpcResponse>(pinResult);
        if (!pinData) {
          throw new Error('INVALID_PIN: Unexpected response format');
        }

        if (!pinData?.success) {
          throw new Error(`INVALID_PIN: ${pinData?.message || 'Incorrect PIN code'}`);
        }

        const result: LoginResult = {
          userId: String(pinData.user_id),
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

        // ✅ Write tenant_id directly for backward compatibility (DecisionCard.tsx, DoctorPatientList.tsx, etc.)
        localStorage.setItem('tenant_id', result.tenantId);

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
    try {
      const { data: licenseResult, error: licenseError } = await supabase.rpc(
        'validate_license',
        { p_license_key: licenseKey.trim(), p_device_fingerprint: null },
      );
      if (licenseError) {
        setStatus('error');
        setError(licenseError.message);
        return { success: false, message: licenseError.message };
      }
      const licenseData = parseRpcResponse<RpcResponse>(licenseResult);
      if (!licenseData || !licenseData.success) {
        const msg = licenseData?.message || 'License validation failed';
        setStatus('error');
        setError(msg);
        return { success: false, message: msg };
      }
      const tenantId = String(licenseData.tenant_id);
      localStorage.setItem('tenant_id', tenantId);
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
      if (!tenantId) {
        const msg = 'TENANT_NOT_AVAILABLE';
        setStatus('error');
        setError(msg);
        return { success: false, error: msg };
      }
      const { data: pinResult, error: pinError } = await supabase.rpc('validate_pin', { p_tenant_id: tenantId, p_pin: pin.trim(), p_role: role ?? null });
      if (pinError) {
        setStatus('error');
        setError(pinError.message);
        return { success: false, error: pinError.message };
      }
      const pinData = parseRpcResponse<RpcResponse>(pinResult);
      if (!pinData || !pinData.success) {
        const msg = pinData?.message || 'Invalid PIN';
        setStatus('error');
        setError(msg);
        return { success: false, error: msg };
      }
      // Persist PIN auth similar to original flow
      localStorage.setItem('core_pin_auth', JSON.stringify({ user_id: String(pinData.user_id), full_name: pinData.full_name ?? null, role: pinData.role ?? null, tenant_id: tenantId, expiry: Date.now() + (24 * 60 * 60 * 1000) }));
      setStatus('success');
      const userObj: any = { id: String(pinData.user_id) };
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
  };

  const clearError = () => setError(null);

  return {
    login,
    isPending: login.isPending,
    isLoading: login.isPending,
    user: null as any,
    isAuthenticated: login.isSuccess,
    validateLicense,
    loginWithPin,
    logout,
    error,
    status,
    tenant_id: localStorage.getItem('tenant_id') || null,
    clearError,
  };
}