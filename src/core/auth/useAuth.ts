// src/core/auth/useAuth.ts
// Blueprint: src/core/auth/useAuth.ts
// Purpose: Email + PIN + License validation
// UPDATED: 2026-06-24 — Fixed validate_license to handle jsonb response + added diagnostic logs

import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';

// ─── Types ───
interface LoginCredentials {
  email?: string;
  password?: string;
  pinCode?: string;
  licenseKey: string;
  role?: string; // ← REQUIRED for PIN login
}

interface LoginResult {
  userId: string;
  email: string | null;
  fullName: string | null;
  role: string | null;
  tenantId: string;
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

      // ═══════════════════════════════════════════════════════════════
      // 1. Validate the license and obtain the trusted tenant ID.
      // ═══════════════════════════════════════════════════════════════
      const { data: licenseResult, error: licenseError } = await supabase.rpc(
        'validate_license',
        {
          params: {
            p_license_key: licenseKey.trim(),
            p_device_fingerprint: null,
          },
        },
      );

      // 🔍 DIAGNOSTIC LOGS — سأحذفها بعد التأكد من أن كل شيء يعمل
      console.log('🔍 === validate_license response ===');
      console.log('🔍 licenseResult:', licenseResult);
      console.log('🔍 licenseError:', licenseError);
      console.log('🔍 typeof licenseResult:', typeof licenseResult);
      console.log('🔍 isArray:', Array.isArray(licenseResult));
      console.log('🔍 keys:', licenseResult ? Object.keys(licenseResult) : 'null');

      if (licenseError) {
        console.error('🔍 licenseError details:', licenseError);
        throw new Error(`INVALID_LICENSE: ${licenseError.message}`);
      }

      // Handle all possible response formats from Supabase RPC
      let licenseData: any;

      if (licenseResult === null || licenseResult === undefined) {
        throw new Error('INVALID_LICENSE: Empty response from server');
      }

      if (licenseResult && typeof licenseResult === 'object') {
        // Supabase might wrap the result in { data: ... }
        if (licenseResult.data !== undefined) {
          licenseData = licenseResult.data;
          console.log('🔍 Unwrapped from .data:', licenseData);
        } else {
          licenseData = licenseResult;
          console.log('🔍 Direct object:', licenseData);
        }
      } else if (Array.isArray(licenseResult) && licenseResult.length > 0) {
        licenseData = licenseResult[0];
        console.log('🔍 Extracted from array:', licenseData);
      } else if (typeof licenseResult === 'string') {
        try {
          licenseData = JSON.parse(licenseResult);
          console.log('🔍 Parsed from JSON string:', licenseData);
        } catch {
          throw new Error('INVALID_LICENSE: Invalid JSON response');
        }
      } else {
        throw new Error('INVALID_LICENSE: Unexpected response format');
      }

      console.log('🔍 Final licenseData:', licenseData);
      console.log('🔍 success:', licenseData?.success);
      console.log('🔍 tenant_id:', licenseData?.tenant_id);
      console.log('🔍 clinic_name:', licenseData?.clinic_name);

      if (!licenseData?.success) {
        throw new Error(`INVALID_LICENSE: ${licenseData?.message || 'License validation failed'}`);
      }

      const tenantId = String(licenseData.tenant_id);
      console.log('🔍 Extracted tenantId:', tenantId);

      if (!tenantId || tenantId === 'null' || tenantId === 'undefined' || tenantId === '') {
        throw new Error('TENANT_MISSING: Tenant ID was not returned by license validation');
      }

      // ═══════════════════════════════════════════════════════════════
      // 2. Email + Password Login
      // ═══════════════════════════════════════════════════════════════
      if (loginEmail?.trim() && password) {
        const { data: authResult, error: validateError } = await supabase.rpc(
          'validate_email_password',
          {
            params: {
              p_email: loginEmail.trim(),
              p_password: password,
              p_tenant_id: tenantId,
            },
          },
        );

        if (validateError) {
          throw new Error(`AUTH_FAILED: ${validateError.message}`);
        }

        const authData = authResult as any;

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

        localStorage.setItem(
          PIN_AUTH_KEY,
          JSON.stringify({
            user_id: result.userId,
            full_name: result.fullName,
            role: result.role,
            tenant_id: tenantId,
            expiry: Date.now() + PIN_SESSION_DURATION_MS,
          }),
        );

        return result;
      }

      // ═══════════════════════════════════════════════════════════════
      // 3. PIN Login
      // ═══════════════════════════════════════════════════════════════
      if (pinCode?.trim()) {
        if (!role?.trim()) {
          throw new Error('ROLE_REQUIRED: Role is required for PIN login (doctor, receptionist, clinic_admin, super_admin)');
        }

        const { data: pinResult, error: pinError } = await supabase.rpc(
          'validate_pin',
          {
            params: {
              p_tenant_id: tenantId,
              p_pin: pinCode.trim(),
              p_role: role.trim(),
            },
          },
        );

        if (pinError) {
          throw new Error(`INVALID_PIN: ${pinError.message}`);
        }

        const pinData = pinResult as any;

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

        return result;
      }

      throw new Error('CREDENTIALS_REQUIRED: Provide email+password or PIN');
    },
  });

  return {
    login,
    isPending: login.isPending,
    isLoading: login.isPending,
  };
}