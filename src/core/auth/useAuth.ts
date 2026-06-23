// src/core/auth/useAuth.ts
// Blueprint: src/core/auth/useAuth.ts
// Purpose: Email + PIN + License validation

import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuth as useAuthFromProvider } from './AuthProvider';

// ─── Types ───
interface LoginCredentials {
  email?: string;
  password?: string;
  pinCode?: string;
  licenseKey: string;
}

// Match AuthProvider.tsx key
const PIN_AUTH_KEY = "core_pin_auth";

export function useAuth() {
  const auth = useAuthFromProvider();
  const { logout } = auth;

  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { licenseKey, email: loginEmail, password, pinCode } = credentials;

      if (!licenseKey) {
        throw new Error('LICENSE_REQUIRED: Clinic license key is required');
      }

      // ─── 1. Validate License via RPC ───
      const { data: tenantRows, error: tenantError } = await supabase
        .rpc('validate_license', { p_license_key: licenseKey });

      if (tenantError || !tenantRows || tenantRows.length === 0) {
        throw new Error('INVALID_LICENSE: License key not found');
      }
      const tenant = tenantRows[0];
      if (!tenant.is_active) {
        throw new Error('TENANT_SUSPENDED: This clinic account is suspended');
      }

      let userIdStr: string;
      let userEmail: string | null = null;
      let userFullName: string | null = null;
      let userRole: string | null = null;

      // ─── 2. Email + Password Login ───
      if (loginEmail && password) {
        const { data: users, error: validateError } = await supabase
          .rpc('validate_email_password', { p_email: loginEmail, p_password: password });

        if (validateError || !users || users.length === 0) {
          throw new Error('AUTH_FAILED: Invalid email or password');
        }

        const userProfile = users[0];
        userIdStr = userProfile.id;
        userEmail = userProfile.email;
        userFullName = userProfile.full_name;
        userRole = userProfile.role;

        // FIX: Use core_pin_auth key with correct format
        localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
          user_id: userIdStr,
          full_name: userFullName,
          role: userRole,
          tenant_id: tenant.id,
          expiry: Date.now() + 24 * 60 * 60 * 1000,
        }));

        return { userId: userIdStr, email: userEmail, fullName: userFullName, role: userRole, tenantId: tenant.id };

      // ─── 3. PIN Login ───
      } else if (pinCode) {
        const { data: pinUserRows, error: pinError } = await supabase
          .rpc('validate_pin', { p_tenant_id: tenant.id, p_pin_code: pinCode });
          
        const pinUser = pinUserRows && pinUserRows.length > 0 ? pinUserRows[0] : null;

        if (pinError || !pinUser) {
          throw new Error('INVALID_PIN: Incorrect PIN code');
        }

        userIdStr = pinUser.id;
        userFullName = pinUser.full_name;
        userRole = pinUser.role;
        userEmail = null;

        // FIX: Use core_pin_auth key with correct format
        localStorage.setItem(PIN_AUTH_KEY, JSON.stringify({
          user_id: userIdStr,
          full_name: userFullName,
          role: userRole,
          tenant_id: tenant.id,
          expiry: Date.now() + 24 * 60 * 60 * 1000,
        }));

        return { userId: userIdStr, email: userEmail, fullName: userFullName, role: userRole, tenantId: tenant.id };

      } else {
        throw new Error('CREDENTIALS_REQUIRED: Provide email+password or PIN');
      }
    },
  });

  return {
    isAuthenticated: auth.isAuthenticated,
    isLoading: auth.isLoading,
    userId: auth.userId,
    email: auth.email,
    fullName: auth.fullName,
    role: auth.role,
    tenantId: auth.tenantId,
    logout,
    login,
    isPending: login.isPending,
  };
}
