// src/core/auth/useAuth.ts
import { useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore, type RoleId } from '@/shared/store/authStore';

// Correct return type from validate_pin RPC (Returns TABLE)
interface PinValidationRow {
  id: string;
  full_name: string;
  role: RoleId;
  tenant_id: string;
}

export function useAuth() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { setUser, setTenant, user, tenant } = useAuthStore();

  const clearError = () => setError(null);

  const verifyLicense = async (licenseKey: string): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('master_tenants')
        .select('id, clinic_name, clinic_name_ar, primary_color, subscription_tier, license_key')
        .eq('license_key', licenseKey)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();

      if (tenantError || !tenantData) {
        setError('مفتاح الترخيص غير صالح أو العيادة غير نشطة');
        return false;
      }

      setTenant({
        id: tenantData.id,
        name: tenantData.clinic_name,
        nameAr: tenantData.clinic_name_ar,
        primaryColor: tenantData.primary_color,
        tier: tenantData.subscription_tier,
        licenseKey: tenantData.license_key,
      });

      return true;
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyPin = async (pinCode: string, role: RoleId): Promise<string | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const currentTenant = useAuthStore.getState().tenant;
      if (!currentTenant) {
        setError('خطأ في الجلسة، يرجى إعادة إدخال الترخيص');
        return null;
      }

      // CORRECT RPC CALL: No "params" wrapper, expects Array return
      const { data, error: rpcError } = await supabase.rpc('validate_pin', {
        p_tenant_id: currentTenant.id,
        p_pin_code: pinCode,
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        setError('خطأ في الاتصال بقاعدة البيانات');
        return null;
      }

      // Data is returned as TABLE (Array of rows)
      const validatedUsers = data as PinValidationRow[] | null;
      
      if (!validatedUsers || validatedUsers.length === 0) {
        setError('رمز PIN غير صحيح');
        return null;
      }

      const validatedUser = validatedUsers[0];

      // Ensure the returned role matches the selected role (Security check)
      if (validatedUser.role !== role) {
        setError('صلاحية الدور غير متطابقة');
        return null;
      }

      setUser({
        id: validatedUser.id,
        fullName: validatedUser.full_name,
        role: validatedUser.role,
        tenantId: validatedUser.tenant_id,
      });

      // Return the target route for the router
      const routes: Record<RoleId, string> = {
        doctor: '/doctor',
        receptionist: '/reception',
        clinic_admin: '/clinic-admin',
        super_admin: '/super-admin',
      };

      return routes[validatedUser.role];
    } catch (err) {
      console.error('Auth error:', err);
      setError('حدث خطأ غير متوقع');
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    useAuthStore.getState().clearAuth();
  };

  return {
    user,
    tenant,
    isLoading,
    error,
    clearError,
    verifyLicense,
    verifyPin,
    logout,
    isAuthenticated: useAuthStore.getState().selectIsAuthenticated(),
  };
}
