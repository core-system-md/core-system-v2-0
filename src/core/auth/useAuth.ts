// src/core/auth/useAuth.ts
// Blueprint: src/core/auth/useAuth.ts
// Purpose: Email + PIN + License validation

import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';

// ─── Types ───
interface LoginCredentials {
  email?: string;
  password?: string;
  pinCode?: string;
  licenseKey: string;
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
      } = credentials;

      if (!licenseKey?.trim()) {
        throw new Error('LICENSE_REQUIRED: Clinic license key is required');
      }

      // 1. Validate the license and obtain the trusted tenant ID.
      const { data: tenantRows, error: tenantError } = await supabase.rpc(
        'validate_license',
        { p_license_key: licenseKey.trim() },
      );

      if (tenantError) {
        throw new Error(`INVALID_LICENSE: ${tenantError.message}`);
      }

      const tenant = tenantRows?.[0];

      if (!tenant) {
        throw new Error('INVALID_LICENSE: License key not found');
      }

      if (!tenant.is_active) {
        throw new Error('TENANT_SUSPENDED: This clinic account is suspended');
      }

      const tenantId = String(tenant.id);

      if (!tenantId) {
        throw new Error('TENANT_MISSING: Tenant ID was not returned by license validation');
      }

      // 2. Email + Password Login
      if (loginEmail?.trim() && password) {
        const { data: users, error: validateError } = await supabase.rpc(
          'validate_email_password',
          {
            p_email: loginEmail.trim(),
            p_password: password,
          },
        );

        if (validateError) {
          throw new Error(`AUTH_FAILED: ${validateError.message}`);
        }

        const userProfile = users?.[0];

        if (!userProfile) {
          throw new Error('AUTH_FAILED: Invalid email or password');
        }

        const result: LoginResult = {
          userId: String(userProfile.id),
          email: userProfile.email ?? null,
          fullName: userProfile.full_name ?? null,
          role: userProfile.role ?? null,
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
        const { data: pinUserRows, error: pinError } = await supabase.rpc(
          'validate_pin',
          {
            p_tenant_id: tenantId,
            p_pin_code: pinCode.trim(),
          },
        );

        if (pinError) {
          throw new Error(`INVALID_PIN: ${pinError.message}`);
        }

        const pinUser = pinUserRows?.[0];

        if (!pinUser) {
          throw new Error('INVALID_PIN: Incorrect PIN code');
        }

        const result: LoginResult = {
          userId: String(pinUser.id),
          email: null,
          fullName: pinUser.full_name ?? null,
          role: pinUser.role ?? null,
          // RPC result is authoritative after successful PIN validation.
          tenantId: String(pinUser.tenant_id),
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