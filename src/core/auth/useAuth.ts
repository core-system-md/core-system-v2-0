import { useCallback } from 'react';
import { useAuthStore, selectIsPinLocked, selectPinAttemptsRemaining, selectUserRole } from '@/shared/store/authStore';
import { supabase } from '@/infrastructure/supabase/client';
import type { AuthUser } from '@/shared/store/authStore';

// P37-C: Local type for RPC result normalization
type RpcResult = Record<string, unknown> | null | undefined;

export function useAuth() {
  const store = useAuthStore();
  const isPinLocked = selectIsPinLocked(store);
  const attemptsRemaining = selectPinAttemptsRemaining(store);
  const userRole = selectUserRole(store);
  const fullName = store.user?.full_name ?? '';
  const role = store.user?.role ?? null;

  const validateLicense = useCallback(async (key?: string) => {
    const licenseKey = key?.trim();
    if (!licenseKey) { store.setError('LICENSE_REQUIRED'); return { success: false, error: 'LICENSE_REQUIRED' }; }
    try {
      const { data, error: rpcError } = await supabase.rpc('validate_license', { p_license_key: licenseKey });
      if (rpcError) { store.setError(rpcError.message); return { success: false, error: rpcError.message }; }
      const tenantRows = Array.isArray(data) ? data : [data];
      const tenant = tenantRows[0] as RpcResult;
      if (!tenant?.id) { store.setError('INVALID_LICENSE'); return { success: false, error: 'INVALID_LICENSE' }; }
      store.setTenant(String(tenant.id), {
        clinicName: (tenant.clinic_name as string | null) || null,
        subscriptionTier: (tenant.subscription_tier as string) || 'trial',
        primaryColor: (tenant.primary_color as string | null) || '#1B2A4A',
        logoUrl: (tenant.logo_url as string | null) || null,
      });
      return { success: true, tenant_id: String(tenant.id) };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'License validation failed';
      store.setError(msg);
      return { success: false, error: msg };
    }
  }, [store]);

  const loginWithPin = useCallback(async (pin: string) => {
    if (!pin || pin.length !== 4) {
      store.setError('PIN must be exactly 4 digits');
      return { success: false, error: 'PIN must be exactly 4 digits' };
    }
    if (import.meta.env.DEV) {
      const mockUser: AuthUser = { id: 'dev-user', email: null, full_name: 'Dev Doctor', full_name_ar: null, role: 'doctor', tenant_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', employee_code: 'DEV-EMP', pin_code: null, phone: null, specialization: null };
      store.login(mockUser, null, null); store.setPinAuthenticated(true); return { success: true, user: mockUser };
    }
    const tenantId = store.tenant_id || store.user?.tenant_id || '';
    if (!tenantId) return { success: false, error: 'Missing tenant ID' };
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('validate_pin', { p_tenant_id: tenantId, p_pin: pin });
      if (rpcError) { store.setError(rpcError.message); store.unauthenticate(); store.incrementPinAttempt(); return { success: false, error: rpcError.message }; }
      const pinUserRows = Array.isArray(rpcData) ? rpcData : [rpcData];
      const pinUser = pinUserRows.length > 0 ? (pinUserRows[0] as RpcResult) : null;
      if (!pinUser) { const msg = 'Invalid PIN'; store.setError(msg); store.unauthenticate(); store.incrementPinAttempt(); return { success: false, error: msg }; }
      store.resetPinAttempts();
      const profile = pinUser;
      const { data: sessionData } = await supabase.auth.getSession();
      const sbSession = sessionData?.session;
      const authUser: AuthUser = {
        id: String(profile.id ?? ''),
        email: (profile.email as string | null) ?? null,
        full_name: (profile.full_name as string) ?? '',
        full_name_ar: (profile.full_name_ar as string | null) ?? null,
        role: (profile.role as AuthUser['role']) || 'receptionist',
        tenant_id: (profile.tenant_id as string) ?? '',
        employee_code: (profile.employee_code as string | null) ?? null,
        pin_code: (profile.pin_code as string | null) ?? null,
        phone: (profile.phone as string | null) ?? null,
        specialization: (profile.specialization as string | null) ?? null,
      };
      store.login(authUser, sbSession?.user ?? null, sbSession ?? null);
      store.setPinAuthenticated(true);
      return { success: true, user: authUser };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PIN validation failed';
      store.setError(msg);
      store.unauthenticate();
      store.incrementPinAttempt();
      return { success: false, error: msg };
    }
  }, [store]);

  const loginWithEmail = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) { store.setError(error.message); return { success: false, error: error.message }; }
      if (data.user) {
        const authUser: AuthUser = {
          id: data.user.id,
          email: data.user.email ?? null,
          full_name: (data.user.user_metadata?.full_name as string) || '',
          full_name_ar: (data.user.user_metadata?.full_name_ar as string | null) || null,
          role: (data.user.user_metadata?.role as AuthUser['role']) || 'receptionist',
          tenant_id: (data.user.user_metadata?.tenant_id as string) || '',
          employee_code: (data.user.user_metadata?.employee_code as string | null) || null,
          pin_code: null,
          phone: (data.user.user_metadata?.phone as string | null) || null,
          specialization: (data.user.user_metadata?.specialization as string | null) || null,
        };
        store.login(authUser, data.user, data.session);
        return { success: true, user: authUser };
      }
      return { success: false, error: 'No user returned' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Email login failed';
      store.setError(msg);
      return { success: false, error: msg };
    }
  }, [store]);

  const logout = useCallback(async () => { await store.logout(); }, [store]);
  const clearError = useCallback(() => { store.clearError(); }, [store]);
  const signOut = useCallback(async () => { await logout(); }, [logout]);

  return { validateLicense, loginWithPin, loginWithEmail, logout, signOut, clearError, isChecking: store.status === 'CHECKING_SESSION', isAuthenticated: store.isAuthenticated, isPinAuthenticated: store.isPinAuthenticated, user: store.user, status: store.status, error: store.error, isPinLocked, attemptsRemaining, userRole, fullName, role };
}
