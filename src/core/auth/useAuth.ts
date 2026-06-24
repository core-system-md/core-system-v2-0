// src/core/auth/useAuth.ts
// Blueprint: src/core/auth/useAuth.ts
// Purpose: Email + PIN + License validation
// UPDATED: 2026-06-24 — Added diagnostic logs for validate_pin

import { useMutation } from '@tanstack/react-query';
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
            p_device_fingerprint: null,
          },
        },
      );

      console.log('🔍 validate_license response:', licenseResult);
      console.log('🔍 validate_license error:', licenseError);

      if (licenseError) {
        throw new Error(`INVALID_LICENSE: ${licenseError.message}`);
      }

      let licenseData: any;
      if (licenseResult && typeof licenseResult === 'object') {
        licenseData = licenseResult.data !== undefined ? licenseResult.data : licenseResult;
      } else if (Array.isArray(licenseResult) && licenseResult.length > 0) {
        licenseData = licenseResult[0];
      } else {
        throw new Error('INVALID_LICENSE: Unexpected response format');
      }

      console.log('🔍 licenseData:', licenseData);

      if (!licenseData?.success) {
        throw new Error(`INVALID_LICENSE: ${licenseData?.message || 'License validation failed'}`);
      }

      const tenantId = String(licenseData.tenant_id);
      console.log('🔍 tenantId:', tenantId);

      if (!tenantId || tenantId === 'null' || tenantId === 'undefined' || tenantId === '') {
        throw new Error('TENANT_MISSING: Tenant ID was not returned by license validation');
      }

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

        console.log('🔍 === validate_pin request ===');
        console.log('🔍 tenantId:', tenantId);
        console.log('🔍 pinCode:', pinCode.trim());
        console.log('🔍 role:', role.trim());

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

        console.log('🔍 validate_pin response:', pinResult);
        console.log('🔍 validate_pin error:', pinError);
        console.log('🔍 typeof pinResult:', typeof pinResult);
        console.log('🔍 isArray:', Array.isArray(pinResult));

        if (pinError) {
          console.error('🔍 pinError details:', pinError);
          throw new Error(`INVALID_PIN: ${pinError.message}`);
        }

        let pinData: any;
        if (pinResult && typeof pinResult === 'object') {
          pinData = pinResult.data !== undefined ? pinResult.data : pinResult;
        } else if (Array.isArray(pinResult) && pinResult.length > 0) {
          pinData = pinResult[0];
        } else {
          throw new Error('INVALID_PIN: Unexpected response format');
        }

        console.log('🔍 pinData:', pinData);
        console.log('🔍 pinData.success:', pinData?.success);
        console.log('🔍 pinData.user_id:', pinData?.user_id);
        console.log('🔍 pinData.role:', pinData?.role);

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

        console.log('🔍 LoginResult:', result);

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