// src/features/auth/AuthScreen.tsx
// Constitution §9.6 compliant: No hardcoded PINs, uses verify_pin_hash RPC

import { useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';

// Role definitions (NO PINs here - only UI metadata)
const ROLES = [
  { id: 'doctor', label: 'Doctor', labelAr: 'طبيب', icon: 'Stethoscope', color: '#1B2A4A' },
  { id: 'receptionist', label: 'Reception', labelAr: 'استقبال', icon: 'Users', color: '#059669' },
  { id: 'clinic_admin', label: 'Admin', labelAr: 'مدير', icon: 'Shield', color: '#d97706' },
  { id: 'super_admin', label: 'Super Admin', labelAr: 'مشرف عام', icon: 'Crown', color: '#dc2626' },
] as const;

type RoleId = typeof ROLES[number]['id'];

export function AuthScreen() {
  const [licenseKey, setLicenseKey] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'license' | 'role' | 'pin'>('license');
  
  const navigate = useNavigate();
  const { setUser, setTenant } = useAuthStore();

  const verifyLicense = async () => {
    if (!licenseKey.trim()) return;
    setLoading(true);
    
    const { data: tenant } = await supabase
      .from('master_tenants')
      .select('id, clinic_name, primary_color, subscription_tier')
      .eq('license_key', licenseKey.trim())
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();
    
    setLoading(false);
    
    if (tenant) {
      setTenant(tenant);
      setStep('role');
      setError(null);
    } else {
      setError('مفتاح الترخيص غير صالح');
    }
  };

  const verifyPin = async () => {
    if (!selectedRole || pin.length !== 4) return;
    setLoading(true);
    setError(null);

    const tenant = useAuthStore.getState().tenant;
    if (!tenant) {
      setError('خطأ في الجلسة، أعد المحاولة');
      setLoading(false);
      return;
    }

    const { data, error: rpcError } = await supabase.rpc('verify_pin_hash', {
      p_tenant_id: tenant.id,
      p_role: selectedRole,
      p_pin: pin
    });

    setLoading(false);

    if (rpcError) {
      setError('خطأ في الاتصال بالخادم');
      return;
    }

    // Handle rate limiting
    if (data?.reason === 'RATE_LIMITED') {
      setError('تم تجاوز عدد المحاولات المسموح، حاول بعد 15 دقيقة');
      setPin('');
      return;
    }

    if (!data?.success || !data?.user_id) {
      setError('رمز PIN غير صحيح');
      setPin('');
      return;
    }

    // Success - fetch full user and set auth state
    const { data: user } = await supabase
      .from('clinic_users')
      .select('id, full_name, role, tenant_id')
      .eq('id', data.user_id)
      .single();

    if (user) {
      setUser(user);
      // Navigate based on role
      const routes: Record<RoleId, string> = {
        doctor: '/doctor',
        receptionist: '/reception',
        clinic_admin: '/clinic_admin',
        super_admin: '/super_admin'
      };
      navigate(routes[selectedRole]);
    }
  };

  // ... render methods (license, role, pin steps)
}