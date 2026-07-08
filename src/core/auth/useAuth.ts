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

    try {
      const { data, error: rpcError } = await supabase.rpc('validate_license', {
        p_license_key: licenseKey,
        p_device_fingerprint: '',
      });

      if (rpcError) {
        store.setError(`INVALID_LICENSE: ${rpcError.message}`);
        return { success: false, error: rpcError.message };
      }

      const tenantRows = Array.isArray(data) ? data : [data];
      const tenant = tenantRows[0] as any;
      if (!tenant || !tenant.id) {
        store.setError('INVALID_LICENSE: License not found or inactive');
        return { success: false, error: 'INVALID_LICENSE' };
      }

      const tenantId = tenant.id as string;
      store.setTenant(tenantId, {
        clinicName: tenant.clinic_name || null,
        subscriptionTier: tenant.subscription_tier || 'trial',
        primaryColor: tenant.primary_color || '#1B2A4A',
        logoUrl: tenant.logo_url || null,
      });
      return { success: true, tenant_id: tenantId };
    } catch (err: any) {
      const msg = err?.message || 'License validation failed';
      store.setError(msg);
      return { success: false, error: msg };
    }
  }, [store]);

  const loginWithPin = useCallback(
    async (pin: string, selectedRole?: string) => {
      const isDevMode = import.meta.env.DEV;
      // DEBUG: Trace start
      console.log('[PIN FLOW] START', {
        pinLength: pin.length,
        selectedRole,
        isDevMode
      });

      // DEV MODE: accept developer PIN for quick testing
      if (isDevMode) {
        const mockUser: AuthUser = {
          id: 'dev-user',
          email: 'dev@core.local',
          full_name: 'Dev Doctor',
          full_name_ar: null,
          role: (selectedRole as AuthUser['role']) || 'doctor',
          tenant_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
          employee_code: 'DEV-EMP',
          pin_code: null,
          phone: null,
          specialization: null,
        };

        store.login(mockUser, null, null);
        store.setPinAuthenticated(true);
        return { success: true, user: mockUser };
      }

      // End DEV MODE

      // Previously: only accepted '0000' in DEV. Now DEV returns above.
      

      const tenantId = store.tenant_id || store.user?.tenant_id || '';
      if (!tenantId) {
        return { success: false, error: 'Missing tenant ID — validate license first' };
      }

      try {
        // DEBUG: Trace tenantId before RPC
        console.log('[PIN FLOW] tenantId', tenantId);

        // DEBUG: Trace before RPC
        console.log('[PIN FLOW] BEFORE RPC', {
          tenantId,
          pinLength: pin.length
        });

        const { data: rpcData, error: rpcError } = await supabase.rpc('validate_pin', {
          p_tenant_id: tenantId,
          p_pin: pin,
        });

        // DEBUG: Trace RPC result with full details
        console.log('[PIN FLOW] RPC RESULT DETAIL', {
          data: rpcData,
          dataType: typeof rpcData,
          isArray: Array.isArray(rpcData),
          arrayLength: Array.isArray(rpcData) ? rpcData.length : null,
          firstItem: Array.isArray(rpcData) ? rpcData[0] : rpcData,
          error: rpcError,
          errorMessage: rpcError?.message,
          errorCode: rpcError?.code
        });

        if (rpcError) {
          store.incrementPinAttempt();
          store.setError(rpcError.message ?? 'PIN_RPC_ERROR');
          return { success: false, error: rpcError.message };
        }

        const pinUserRows = Array.isArray(rpcData) ? rpcData : [rpcData];
        const pinUser = pinUserRows.length > 0 ? pinUserRows[0] : null;

        if (!pinUser) {
          store.incrementPinAttempt();
          const msg = 'Invalid PIN or user not found';
          store.setError(msg);
          return { success: false, error: msg };
        }

        store.resetPinAttempts();
        const profile = pinUser as any;

        if (selectedRole && profile.role !== selectedRole) {
          console.warn(`[Auth] Role mismatch: selected=${selectedRole}, db=${profile.role}`);
        }

        const { data: sessionData } = await supabase.auth.getSession();
        const sbSession = sessionData?.session;

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

        // DEBUG: Trace before store.login
        console.log('[PIN FLOW] BEFORE STORE LOGIN', {
          id: profile.id,
          role: profile.role,
          tenant_id: profile.tenant_id
        });

        store.login(authUser, sbSession?.user ?? null, sbSession ?? null);
        store.setPinAuthenticated(true);

        // DEBUG: Trace after store.login
        console.log('[PIN FLOW] AFTER STORE LOGIN', {
          status: store.status,
          isAuthenticated: store.isAuthenticated
        });

        return { success: true, user: authUser };
      } catch (err: any) {
        const msg = err?.message || 'PIN validation failed';
        store.incrementPinAttempt();
        store.setError(msg);
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
    // New: Email/password sign-in
    loginWithEmail: async (email: string, password: string) => {
      if (!email || !password) return { success: false, error: 'EMAIL_PASSWORD_REQUIRED' };
      try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          return { success: false, error: error.message };
        }
        const userObj = data.user;
        if (!userObj) return { success: false, error: 'AUTH_FAILED' };

        // Fetch profile from clinic_users
        const { data: profileData, error: profileError } = await supabase
          .from('clinic_users')
          .select('*')
          .eq('id', userObj.id)
          .single();

        if (profileError || !profileData) {
          return { success: false, error: profileError?.message || 'PROFILE_NOT_FOUND' };
        }

        const profile = profileData as any;

        const authUser: AuthUser = {
          id: profile.id,
          email: userObj.email ?? null,
          full_name: profile.full_name ?? '',
          full_name_ar: profile.full_name_ar ?? null,
          role: (profile.role as AuthUser['role']) || 'receptionist',
          tenant_id: profile.tenant_id ?? '',
          employee_code: profile.employee_code ?? null,
          pin_code: profile.pin_code ?? null,
          phone: profile.phone ?? null,
          specialization: profile.specialization ?? null,
        };

        store.login(authUser, userObj, data.session ?? null);
        store.setPinAuthenticated(true);
        return { success: true, user: authUser };
      } catch (err: any) {
        return { success: false, error: err?.message || 'AUTH_ERROR' };
      }
    },
  };
}