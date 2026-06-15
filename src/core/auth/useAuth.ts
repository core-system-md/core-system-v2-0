// Real auth: Email + PIN + License validation + Device limiter

import { useMutation } from '@tanstack/react-query';
import { supabase } from '../../infrastructure/supabase/client';
import { useAuthContext } from './AuthProvider';
import { useTenantStore } from '../../shared/store/tenantStore';

// ─── Device Fingerprint ───
async function generateDeviceFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.colorDepth,
    `${screen.width}x${screen.height}`,
    new Date().getTimezoneOffset(),
  ];
  const hash = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(components.join('||'))
  );
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function detectDeviceType(): string {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua)) return 'doctor_tablet';
  if (/Mobile/i.test(ua)) return 'mobile';
  return 'reception_desktop';
}

// ─── Types ───
interface LoginCredentials {
  email?: string;
  password?: string;
  pinCode?: string;
  licenseKey: string;
}

export function useAuth() {
  const { isAuthenticated, isLoading, userId, email, fullName, role, tenantId, logout, setUser } = useAuthContext();
  const { setTenantId, setTenantName, setPrimaryColor, setSubscriptionTier } = useTenantStore();

  const login = useMutation({
    mutationFn: async (credentials: LoginCredentials) => {
      const { licenseKey, email: loginEmail, password, pinCode } = credentials;

      if (!licenseKey) {
        throw new Error('LICENSE_REQUIRED: Clinic license key is required');
      }

      // ─── 1. Validate License via RPC (bypasses RLS) ───
      const { data: tenantRows, error: tenantError } = await supabase
        .rpc('validate_license', { p_license_key: licenseKey });

      if (tenantError || !tenantRows || tenantRows.length === 0) {
        throw new Error('INVALID_LICENSE: License key not found');
      }
      const tenant = tenantRows[0];
      if (!tenant.is_active) {
        throw new Error('TENANT_SUSPENDED: This clinic account is suspended');
      }

      // ─── 2. Device Limiter ───
      const { count: deviceCount, error: deviceError } = await supabase
        .from('tenant_devices')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenant.id)
        .eq('is_active', true);

      if (deviceError) throw deviceError;
      if (deviceCount && deviceCount >= tenant.max_devices) {
        throw new Error(`DEVICE_LIMIT_EXCEEDED: Maximum ${tenant.max_devices} devices for ${tenant.subscription_tier} tier`);
      }

      let userIdStr: string;
      let userEmail: string | null = null;
      let userFullName: string | null = null;
      let userRole: string | null = null;

      // ─── 3. Email + Password Login ───
      if (loginEmail && password) {
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: loginEmail,
          password,
        });

        if (authError) throw new Error(`AUTH_FAILED: ${authError.message}`);
        if (!authData.user) throw new Error('AUTH_FAILED: No user returned');

        userIdStr = authData.user.id;
        userEmail = authData.user.email ?? null;

        const { data: profile, error: profileError } = await supabase
          .from('clinic_users')
          .select('full_name, role')
          .eq('id', userIdStr)
          .eq('tenant_id', tenant.id)
          .single();

        if (profileError || !profile) {
          throw new Error('USER_NOT_FOUND: Staff profile not found in this clinic');
        }
        userFullName = profile.full_name;
        userRole = profile.role;

        // Inject tenant_id into JWT for RLS
        await supabase.auth.updateUser({
          data: { tenant_id: tenant.id, user_role: userRole, full_name: userFullName },
        });
        await supabase.auth.refreshSession();

      // ─── 4. PIN Login ───
      } else if (pinCode) {
        const { data: pinUser, error: pinError } = await supabase
          .from('clinic_users')
          .select('id, full_name, role, pin_code')
          .eq('tenant_id', tenant.id)
          .eq('pin_code', pinCode)
          .single();

        if (pinError || !pinUser) {
          throw new Error('INVALID_PIN: Incorrect PIN code');
        }

        userIdStr = pinUser.id;
        userFullName = pinUser.full_name;
        userRole = pinUser.role;
        userEmail = null;

        setUser({
          userId: userIdStr,
          email: null,
          fullName: userFullName,
          role: userRole as any,
          tenantId: tenant.id,
        });

      } else {
        throw new Error('CREDENTIALS_REQUIRED: Provide email+password or PIN');
      }

      // ─── 5. Register Device ───
      const fingerprint = await generateDeviceFingerprint();
      await supabase
        .from('tenant_devices')
        .upsert(
          {
            tenant_id: tenant.id,
            device_fingerprint: fingerprint,
            device_type: detectDeviceType(),
            device_name: navigator.platform,
            os_info: navigator.userAgent,
            browser_info: navigator.userAgent,
            is_active: true,
            last_seen_at: new Date().toISOString(),
          },
          { onConflict: 'tenant_id,device_fingerprint' }
        );

      // ─── 6. Update Tenant Store ───
      setTenantId(tenant.id);
      setTenantName(tenant.name);
      setPrimaryColor((tenant.settings?.primaryColor || '#1B2A4A') || '#1B2A4A');
      setSubscriptionTier(tenant.subscription_tier);

      return {
        userId: userIdStr,
        email: userEmail,
        fullName: userFullName,
        role: userRole,
        tenantId: tenant.id,
        tenantName: tenant.name,
      };
    },
  });

  return {
    isAuthenticated,
    isLoading,
    userId,
    email,
    fullName,
    role,
    tenantId,
    logout,
    login,
    isPending: login.isPending,
  };
}
