// src/core/auth/useAuth.ts
// Blueprint: src/core/auth/useAuth.ts
// Purpose: Email + PIN + License validation
// UPDATED: 2026-06-24 — Fixed validate_pin to use jsonb params (p_tenant_id, p_pin, p_role)

import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';

// ─── Types ───
interface LoginCredentials {
  email?: string;
  password?: string;
  pinCode?: string;
  licenseKey: string;
  role?: string; // ← REQUIRED for PIN login (doctor, receptionist, clinic_admin, super_admin)
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

      // 1. Validate the license and obtain the trusted tenant ID.
      const { data: licenseResult, error: licenseError } = await supabase.rpc(
        'validate_license',
        {
          params: {
            p_license_key: licenseKey.trim(),
            p_device_fingerprint: null, // optional
          },
        },
      );

      if (licenseError) {
        throw new Error(`INVALID_LICENSE: ${licenseError.message}`);
      }

      // validate_license now returns jsonb, not a rowset
      const licenseData = licenseResult as any;

      if (!licenseData?.success) {
        throw new Error(`INVALID_LICENSE: ${licenseData?.message || 'License key not found'}`);
      }

      if (!licenseData.tenant_id) {
        throw new Error('TENANT_MISSING: Tenant ID was not returned by license validation');
      }

      const tenantId = String(licenseData.tenant_id);

      // 2. Email + Password Login
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

      // 3. PIN Login
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
    // New preferred name.
    isPending: login.isPending,
    // Backward compatibility for existing components such as PinPad.tsx.
    isLoading: login.isPending,
  };
}