// ============================================================
// CORE SYSTEM v2.1 — useAuth Hook
// ALL Business Logic for Authentication lives here.
// AuthScreen.tsx is VIEW ONLY — NO supabase calls inside it.
// Constitution §9.6: PIN Auth — 4-digit PIN, rate limiting, hash verification.
// Constitution §9.5: JWT Claims — tenant_id + user_role injected.
// ============================================================

import { useCallback } from 'react';
import { useAuthStore } from '@/shared/store/authStore';
import { 
  validateLicenseKey, 
  validatePin, 
  logPinAttempt,
  signOut as supabaseSignOut,
  getCurrentSession,
} from '@/infrastructure/supabase/client';
import type { UserRole } from '@/shared/types/auth';

export function useAuth() {
  const store = useAuthStore();

  // ── License Validation ──
  // Step 1: User enters License Key → validate → get tenant_id
  const validateLicense = useCallback(async (licenseKey: string) => {
    store.setLoading(true);
    store.setError(null);
    store.setStatus('validating_license');

    try {
      const result = await validateLicenseKey(licenseKey);
      
      if (!result || !result.tenant_id) {
        throw new Error('INVALID_LICENSE');
      }

      // Store tenant_id in AuthStore (Single Source)
      store.setTenant(result.tenant_id, {
        tenant_id: result.tenant_id,
        license_key: licenseKey,
        clinic_name: result.clinic_name || '',
        subscription_tier: result.subscription_tier || 'trial',
        is_valid: true,
      });

      store.setStatus('license_valid');
      return { success: true, tenant_id: result.tenant_id };
    } catch (err: any) {
      const message = err.message === 'INVALID_LICENSE' 
        ? 'مفتاح الترخيص غير صالح. يرجى التحقق والمحاولة مرة أخرى.'
        : err.message || 'حدث خطأ أثناء التحقق من الترخيص.';
      
      store.setError(message);
      store.setStatus('error');
      return { success: false, error: message };
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // ── PIN Login ──
  // Step 2: User enters 4-digit PIN → validate via RPC → get user + role
  // Constitution §9.6: validate_pin RPC returns TABLE(id, full_name, role, tenant_id)
  const loginWithPin = useCallback(async (pinCode: string) => {
    const tenantId = store.tenant_id;

    if (!tenantId) {
      store.setError('معرف المستأجر مفقود. يرجى إدخال مفتاح الترخيص أولاُ.');
      return { success: false, error: 'MISSING_TENANT_ID' };
    }

    // Rate limiting check
    if (store.pinLockedUntil && Date.now() < store.pinLockedUntil) {
      const remaining = Math.ceil((store.pinLockedUntil - Date.now()) / 60000);
      store.setError(`تم قفل المحاولات. يرجى الانتظار ${remaining} دقيقة.`);
      return { success: false, error: 'PIN_LOCKED' };
    }

    store.setLoading(true);
    store.setError(null);
    store.setStatus('authenticating_pin');

    try {
      // Validate PIN via RPC
      // RETURNS TABLE(id uuid, full_name text, role text, tenant_id uuid)
      const userData = await validatePin(tenantId, pinCode);

      if (!userData || !userData.id) {
        throw new Error('INVALID_PIN');
      }

      // Verify tenant match (security)
      if (userData.tenant_id !== tenantId) {
        throw new Error('TENANT_MISMATCH');
      }

      // Reset PIN attempts on success
      store.resetPinAttempts();

      // Set user in store (Single Source of Session)
      store.setUser({
        id: userData.id,
        full_name: userData.full_name,
        role: userData.role as UserRole,
        tenant_id: userData.tenant_id,
      });

      store.setStatus('authenticated');
      store.setAuthenticated(true);

      // Log successful attempt
      await logPinAttempt(tenantId, pinCode, true);

      return { 
        success: true, 
        user: {
          id: userData.id,
          full_name: userData.full_name,
          role: userData.role,
          tenant_id: userData.tenant_id,
        }
      };
    } catch (err: any) {
      // Log failed attempt
      await logPinAttempt(tenantId, pinCode, false);
      store.incrementPinAttempt();

      const message = err.message === 'INVALID_PIN'
        ? 'رمز PIN غير صحيح. يرجى المحاولة مرة أخرى.'
        : err.message === 'TENANT_MISMATCH'
        ? 'خطأ في بيانات المستأجر. يرجى التواصل مع الدعم.'
        : err.message || 'حدث خطأ أثناء تسجيل الدخول.';

      store.setError(message);
      store.setStatus('error');
      return { success: false, error: message };
    } finally {
      store.setLoading(false);
    }
  }, [store]);

  // ── Logout ──
  const logout = useCallback(async () => {
    store.setLoading(true);
    try {
      await supabaseSignOut();
    } catch (err) {
      console.error('Supabase signOut error:', err);
    } finally {
      store.logout();
      // Clear any legacy keys (cleanup)
      localStorage.removeItem('core_pin_auth');
      localStorage.removeItem('pin_auth');
      localStorage.removeItem('auth');
      localStorage.removeItem('session');
    }
  }, [store]);

  // ── Session Sync ──
  // Verify Supabase session matches our store (prevent drift)
  const syncSession = useCallback(async () => {
    try {
      const session = await getCurrentSession();
      if (!session && store.isAuthenticated) {
        // Supabase session expired but store says authenticated → logout
        store.logout();
      }
    } catch (err) {
      console.error('Session sync error:', err);
    }
  }, [store]);

  return {
    // State (read-only)
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    status: store.status,
    tenant_id: store.tenant_id,
    license: store.license,
    pinAttempts: store.pinAttempts,
    pinLockedUntil: store.pinLockedUntil,
    
    // Actions
    validateLicense,
    loginWithPin,
    logout,
    syncSession,
    clearError: store.clearError,
  };
}
