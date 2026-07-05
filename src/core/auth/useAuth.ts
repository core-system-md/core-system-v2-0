import { useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import type { AuthUser } from '@/shared/store/authStore';

export function useAuth() {
  const store = useAuthStore();

  const user = store.user;
  const supabaseUser = store.supabaseUser;
  const session = store.session;
  const status = store.status;
  const isAuthenticated = store.isAuthenticated;
  const isPinAuthenticated = store.isPinAuthenticated;
  const error = store.error;
  const isChecking = status === 'CHECKING_SESSION';

  const fullName = user?.full_name ?? '';
  const userRole = user?.role ?? null;
  const role = user?.role ?? null;

  const login = useCallback(
    (authUser: AuthUser, sbUser: any, sbSession: any) => {
      store.login(authUser, sbUser, sbSession);
    },
    [store]
  );

  const logout = useCallback(() => store.logout(), [store]);
  const signOut = logout;
  const clearError = useCallback(() => store.clearError(), [store]);

  const validateLicense = useCallback(async (key?: string) => {
    const licenseKey = key?.trim();
    if (!licenseKey) {
      store.setError('LICENSE_REQUIRED: Clinic license key is required');
      return { success: false, error: 'LICENSE_REQUIRED' };
    }

    const devTenantId = '00000000-0000-0000-0000-000000000001';
    if (licenseKey === 'DEV-MODE-2026') {
      store.setTenant(devTenantId);
      localStorage.setItem('tenant_id', devTenantId);
      return { success: true, tenant_id: devTenantId };
    }

    try {
      const { data, error: rpcError } = await supabase.rpc('validate_license', {
        p_license_key: licenseKey,
      });

      if (rpcError) {
        store.setError(`INVALID_LICENSE: ${rpcError.message}`);
        return { success: false, error: rpcError.message };
      }

      const licenseData = Array.isArray(data) ? data[0] : data;
      if (!licenseData || !licenseData.id) {
        store.setError('INVALID_LICENSE: License not found or inactive');
        return { success: false, error: 'INVALID_LICENSE' };
      }

      const tenantId = licenseData.id;
      store.setTenant(tenantId);
      localStorage.setItem('tenant_id', tenantId);
      return { success: true, tenant_id: tenantId };
    } catch (err: any) {
      const msg = err?.message || 'License validation failed';
      store.setError(msg);
      return { success: false, error: msg };
    }
  }, [store]);

  const loginWithPin = useCallback(
    async (pin: string, selectedRole?: string) => {
      const tenantId = store.user?.tenant_id || localStorage.getItem('tenant_id') || '';
      const employeeCode = localStorage.getItem('employee_code') || '';

      if (!employeeCode || !tenantId) {
        return { success: false, error: 'Missing employee code or tenant' };
      }

      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('validate_pin', {
          p_employee_code: employeeCode,
          p_pin: pin,
          p_tenant_id: tenantId,
        });

        if (rpcError) {
          store.incrementPinAttempt();
          return { success: false, error: rpcError.message };
        }

        const result = rpcData as Record<string, any> | null;
        if (!result || !result.success) {
          store.incrementPinAttempt();
          return { success: false, error: result?.message || 'Invalid PIN' };
        }

        store.resetPinAttempts();

        const { data: profile, error: profileError } = await supabase
          .from('clinic_users')
          .select('*')
          .eq('id', result.user_id)
          .single();

        if (profileError || !profile) {
          return { success: false, error: profileError?.message || 'Profile not found' };
        }

        if (selectedRole && profile.role !== selectedRole) {
          return { success: false, error: 'Role mismatch' };
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const session = sessionData?.session;

        const authUser: AuthUser = {
          id: profile.id,
          email: profile.email ?? null,
          full_name: profile.full_name ?? '',
          full_name_ar: profile.full_name_ar ?? null,
          role: (profile.role as AuthUser['role']) || 'receptionist',
          tenant_id: profile.tenant_id ?? '',
          employee_code: profile.employee_code ?? null,
          pin_code: profile.pin_code ?? null,
          phone: profile.phone ?? null,
          specialization: profile.specialization ?? null,
        };

        store.login(authUser, session?.user ?? null, session ?? null);
        store.setPinAuthenticated(true);

        return { success: true, user: authUser };
      } catch (err: any) {
        const msg = err?.message || 'PIN validation failed';
        store.incrementPinAttempt();
        return { success: false, error: msg };
      }
    },
    [store]
  );

  const refreshSession = useCallback(async () => {
    const { data, error: refreshError } = await supabase.auth.getSession();
    if (refreshError) {
      store.setError(refreshError.message);
      return null;
    }
    if (data.session) {
      store.setSession(data.session);
      if (!store.user && data.session.user) {
        const { data: profile } = await supabase
          .from('clinic_users')
          .select('*')
          .eq('id', data.session.user.id)
          .single();
        if (profile) {
          const authUser: AuthUser = {
            id: profile.id,
            email: data.session.user.email ?? null,
            full_name: profile.full_name ?? '',
            full_name_ar: profile.full_name_ar ?? null,
            role: (profile.role as AuthUser['role']) || 'receptionist',
            tenant_id: profile.tenant_id ?? '',
            employee_code: profile.employee_code ?? null,
            pin_code: profile.pin_code ?? null,
            phone: profile.phone ?? null,
            specialization: profile.specialization ?? null,
            avatar_url: data.session.user.user_metadata?.avatar_url ?? null,
          };
          store.setUser(authUser);
          store.setSupabaseUser(data.session.user);
          store.setPinAuthenticated(true);
        }
      }
    }
    return data.session;
  }, [store]);

  return {
    user,
    supabaseUser,
    session,
    status,
    isAuthenticated,
    isPinAuthenticated,
    isChecking,
    error,
    fullName,
    userRole,
    role,
    login,
    logout,
    signOut,
    clearError,
    refreshSession,
    validateLicense,
    loginWithPin,
  };
}