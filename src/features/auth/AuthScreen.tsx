import { useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/shared/store/authStore';
import { Shield, Stethoscope, Users, Crown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ROLES = [
  { id: 'doctor' as const, label: 'Doctor', labelAr: 'طبيب', icon: Stethoscope, color: '#1B2A4A' },
  { id: 'receptionist' as const, label: 'Reception', labelAr: 'استقبال', icon: Users, color: '#059669' },
  { id: 'clinic_admin' as const, label: 'Admin', labelAr: 'مدير', icon: Shield, color: '#d97706' },
  { id: 'super_admin' as const, label: 'Super Admin', labelAr: 'مشرف عام', icon: Crown, color: '#dc2626' },
];

type RoleId = typeof ROLES[number]['id'];

export default function AuthScreen() {
  const [licenseKey, setLicenseKey] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'license' | 'role' | 'pin'>('license');
  
  const navigate = useNavigate();
  const { setUser, setTenant } = useAuthStore();

  const verifyLicense = async () => {
    if (!licenseKey.trim()) {
      toast.error('يرجى إدخال مفتاح الترخيص');
      return;
    }
    setLoading(true);
    setError(null);
    
    try {
      const { data: tenant, error: tenantError } = await supabase
        .from('master_tenants')
        .select('id, clinic_name, clinic_name_ar, primary_color, subscription_tier, license_key')
        .eq('license_key', licenseKey.trim())
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();
      
      if (tenantError || !tenant) {
        setError('مفتاح الترخيص غير صالح أو العيادة غير نشطة');
        toast.error('مفتاح الترخيص غير صالح');
        return;
      }
      
      setTenant({
        id: tenant.id,
        name: tenant.clinic_name,
        nameAr: tenant.clinic_name_ar,
        primaryColor: tenant.primary_color,
        tier: tenant.subscription_tier,
        licenseKey: tenant.license_key,
      });
      setStep('role');
      toast.success('تم التحقق من الترخيص');
    } catch (err) {
      setError('خطأ في الاتصال');
      toast.error('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const verifyPin = async () => {
    if (!selectedRole || pin.length !== 4) {
      toast.error('يرجى إدخال رمز PIN مكون من 4 أرقام');
      return;
    }
    
    setLoading(true);
    setError(null);

    try {
      const tenant = useAuthStore.getState().tenant;
      if (!tenant) {
        setError('خطأ في الجلسة');
        toast.error('خطأ في الجلسة، أعد المحاولة');
        setStep('license');
        return;
      }

      const { data, error: rpcError } = await supabase.rpc('verify_pin_hash', {
        p_tenant_id: tenant.id,
        p_role: selectedRole,
        p_pin: pin,
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        setError('خطأ في الاتصال بالخادم');
        toast.error('خطأ في الاتصال بالخادم');
        setPin('');
        return;
      }

      if (data?.reason === 'RATE_LIMITED') {
        setError('تم تجاوز عدد المحاولات المسموح، حاول بعد 15 دقيقة');
        toast.error('تم تجاوز عدد المحاولات المسموح، حاول بعد 15 دقيقة');
        setPin('');
        setLoading(false);
        return;
      }

      if (!data?.success || !data?.user_id) {
        setError('رمز PIN غير صحيح');
        toast.error('رمز PIN غير صحيح');
        setPin('');
        setLoading(false);
        return;
      }

      const { data: user, error: userError } = await supabase
        .from('clinic_users')
        .select('id, full_name, full_name_ar, role, tenant_id, email, phone, specialization')
        .eq('id', data.user_id)
        .single();

      if (userError || !user) {
        setError('خطأ في تحميل بيانات المستخدم');
        toast.error('خطأ في تحميل بيانات المستخدم');
        setLoading(false);
        return;
      }

      setUser({
        id: user.id,
        email: user.email || '',
        fullName: user.full_name,
        fullNameAr: user.full_name_ar,
        role: user.role as RoleId,
        tenantId: user.tenant_id,
        phone: user.phone,
        specialization: user.specialization,
      });

      toast.success(`مرحباً ${user.full_name}`);
      
      const routes: Record<RoleId, string> = {
        doctor: '/doctor',
        receptionist: '/reception',
        clinic_admin: '/clinic_admin',
        super_admin: '/super_admin',
      };
      
      navigate(routes[selectedRole]);
    } catch (err) {
      console.error('Auth error:', err);
      setError('حدث خطأ غير متوقع');
      toast.error('حدث خطأ غير متوقع');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = (role: RoleId) => {
    setSelectedRole(role);
    setStep('pin');
    setPin('');
    setError(null);
  };

  const handleBack = () => {
    if (step === 'pin') {
      setStep('role');
      setPin('');
      setSelectedRole(null);
    } else if (step === 'role') {
      setStep('license');
      setSelectedRole(null);
    }
    setError(null);
  };

  if (step === 'license') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#1B2A4A] rounded-xl flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-[#1B2A4A] mb-1">CORE SYSTEM</h1>
            <p className="text-slate-500 text-sm">نظام إدارة العيادات الذكي</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                مفتاح الترخيص / License Key
              </label>
              <Input
                type="text"
                placeholder="DEMO-LICENSE-2024"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && verifyLicense()}
                className="text-center font-mono text-lg tracking-wider"
                dir="ltr"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">
                {error}
              </div>
            )}

            <Button
              onClick={verifyLicense}
              disabled={loading || !licenseKey.trim()}
              className="w-full bg-[#1B2A4A] hover:bg-[#2a3f6a] text-white h-12"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'التالي →'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'role') {
    const tenant = useAuthStore.getState().tenant;
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold text-[#1B2A4A]">اختر دورك</h2>
            <p className="text-slate-500 text-sm mt-1">
              {tenant?.nameAr || tenant?.name}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              return (
                <button
                  key={role.id}
                  onClick={() => handleRoleSelect(role.id)}
                  className="flex flex-col items-center p-4 rounded-xl border-2 border-slate-200 hover:border-[#1B2A4A] hover:bg-slate-50 transition-all group"
                >
                  <Icon className="w-8 h-8 mb-2" style={{ color: role.color }} />
                  <span className="font-medium text-slate-700 text-sm">{role.label}</span>
                  <span className="text-xs text-slate-400">{role.labelAr}</span>
                </button>
              );
            })}
          </div>

          <button onClick={handleBack} className="mt-4 text-sm text-slate-500 hover:text-slate-700 w-full text-center">
            ← رجوع
          </button>
        </div>
      </div>
    );
  }

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);
  const Icon = selectedRoleData?.icon || Shield;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-8 border border-slate-200">
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto mb-3" style={{ backgroundColor: (selectedRoleData?.color || '#1B2A4A') + '15' }}>
            <Icon className="w-7 h-7" style={{ color: selectedRoleData?.color }} />
          </div>
          <h2 className="text-lg font-bold text-[#1B2A4A]">
            {selectedRoleData?.labelAr} - {selectedRoleData?.label}
          </h2>
          <p className="text-slate-500 text-sm mt-1">أدخل رمز PIN المكون من 4 أرقام</p>
        </div>

        <div className="space-y-4">
          <div className="flex justify-center gap-3 mb-4">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-xl font-bold transition-all ${
                  i < pin.length ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white' : 'border-slate-300 text-slate-300'
                }`}
              >
                {i < pin.length ? '•' : ''}
              </div>
            ))}
          </div>

          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            value={pin}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 4);
              setPin(val);
              if (val.length === 4) setTimeout(() => verifyPin(), 100);
            }}
            className="absolute opacity-0 w-0 h-0"
            autoFocus
          />

          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
              <button
                key={num}
                onClick={() => {
                  if (pin.length < 4) {
                    const newPin = pin + num;
                    setPin(newPin);
                    if (newPin.length === 4) setTimeout(() => verifyPin(), 100);
                  }
                }}
                className="h-14 rounded-lg bg-slate-100 hover:bg-slate-200 text-lg font-semibold text-slate-700 transition-colors"
              >
                {num}
              </button>
            ))}
            <button onClick={handleBack} className="h-14 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-600">رجوع</button>
            <button onClick={() => { if (pin.length < 4) { const newPin = pin + '0'; setPin(newPin); if (newPin.length === 4) setTimeout(() => verifyPin(), 100); } }} className="h-14 rounded-lg bg-slate-100 hover:bg-slate-200 text-lg font-semibold text-slate-700">0</button>
            <button onClick={() => setPin(pin.slice(0, -1))} className="h-14 rounded-lg bg-slate-100 hover:bg-slate-200 text-sm font-medium text-slate-600">⌫</button>
          </div>

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm text-center">{error}</div>}
          {loading && <div className="flex justify-center py-2"><Loader2 className="w-6 h-6 animate-spin text-[#1B2A4A]" /></div>}
        </div>
      </div>
    </div>
  );
}
