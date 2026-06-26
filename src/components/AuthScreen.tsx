import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/infrastructure/supabase/client';
import { Shield, Stethoscope, Users, Settings, UserCog } from 'lucide-react';
import { toast } from 'sonner';

const ROLES = [
  { id: 'doctor', label: 'طبيب', icon: Stethoscope, pin: '5678', color: 'bg-blue-600' },
  { id: 'receptionist', label: 'استقبال', icon: Users, pin: '0000', color: 'bg-green-600' },
  { id: 'clinic_admin', label: 'إدارة العيادة', icon: UserCog, pin: '1234', color: 'bg-purple-600' },
  { id: 'super_admin', label: 'مدير النظام', icon: Settings, pin: '9999', color: 'bg-red-600' },
];

export default function AuthScreen() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'license' | 'role' | 'pin'>('license');
  const [licenseKey, setLicenseKey] = useState('');
  const [selectedRole, setSelectedRole] = useState<string | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [tenantId, setTenantIdState] = useState<string | null>(null);

  // Auto-fill demo license
  useEffect(() => {
    setLicenseKey('DEMO-LICENSE-2024');
  }, []);

  async function validateLicense() {
    if (!licenseKey.trim()) {
      toast.error('الرجاء إدخال مفتاح الترخيص');
      return;
    }
    setLoading(true);

    const { data: tenant } = await supabase
      .from('master_tenants')
      .select('id, clinic_name, subscription_tier, is_active')
      .eq('license_key', licenseKey)
      .is('deleted_at', null)
      .single();

    if (!tenant || !tenant.is_active) {
      toast.error('مفتاح الترخيص غير صالح أو غير نشط');
      setLoading(false);
      return;
    }

    setTenantIdState(tenant.id);
    toast.success(`مرحباً بك في ${tenant.clinic_name}`);
    setStep('role');
    setLoading(false);
  }

  function selectRole(roleId: string) {
    setSelectedRole(roleId);
    setStep('pin');
    setPin('');
  }

  async function verifyPin() {
    if (pin.length !== 4) {
      toast.error('الرجاء إدخال 4 أرقام');
      return;
    }

    setLoading(true);

    // Find user with this PIN and role
    const { data: user } = await supabase
      .from('clinic_users')
      .select('id, full_name, role, tenant_id')
      .eq('tenant_id', tenantId)
      .eq('role', selectedRole)
      .eq('pin_code', pin)
      .eq('is_active', true)
      .is('deleted_at', null)
      .single();

    if (!user) {
      toast.error('PIN غير صحيح');
      setPin('');
      setLoading(false);
      return;
    }

    // Store in localStorage for auth state
    localStorage.setItem('core_auth_user_id', user.id);
    localStorage.setItem('core_auth_user_name', user.full_name);
    localStorage.setItem('core_auth_role', user.role);
    localStorage.setItem('core_auth_tenant_id', user.tenant_id);

    toast.success(`تم تسجيل الدخول كـ ${ROLES.find(r => r.id === user.role)?.label}`);

    // Navigate based on role
    const routes: Record<string, string> = {
      doctor: '/doctor',
      receptionist: '/receptionist',
      clinic_admin: '/clinic_admin',
      super_admin: '/super_admin',
    };
    navigate(routes[user.role] || '/doctor');
    setLoading(false);
  }

  function handlePinDigit(digit: string) {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      if (newPin.length === 4) {
        setTimeout(() => verifyPin(), 200);
      }
    }
  }

  function clearPin() {
    setPin('');
  }

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#1B2A4A]" dir="rtl">
      <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <Shield className="w-16 h-16 mx-auto text-[#1B2A4A] mb-4" />
          <h1 className="text-3xl font-bold text-[#1B2A4A]">CORE SYSTEM</h1>
          <p className="text-gray-500 mt-2">نظام إدارة العيادات</p>
        </div>

        {/* Step 1: License Key */}
        {step === 'license' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">مفتاح الترخيص</label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              placeholder="DEMO-LICENSE-2024"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#1B2A4A] focus:border-transparent text-center tracking-wider"
              dir="ltr"
            />
            <button
              onClick={validateLicense}
              disabled={loading}
              className="w-full bg-[#1B2A4A] text-white py-3 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
            >
              {loading ? 'جاري التحقق...' : 'التحقق من الترخيص'}
            </button>
          </div>
        )}

        {/* Step 2: Role Selection */}
        {step === 'role' && (
          <div className="space-y-4">
            <p className="text-center text-gray-600 mb-4">اختر دورك</p>
            <div className="grid grid-cols-2 gap-3">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  onClick={() => selectRole(role.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-gray-200 hover:border-[#1B2A4A] hover:bg-gray-50 transition-all"
                >
                  <div className={`p-3 rounded-full ${role.color} text-white`}>
                    <role.icon className="w-6 h-6" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">{role.label}</span>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep('license')}
              className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
            >
              ← رجوع
            </button>
          </div>
        )}

        {/* Step 3: PIN Entry */}
        {step === 'pin' && selectedRoleData && (
          <div className="space-y-4">
            <div className="text-center">
              <div className={`inline-flex p-3 rounded-full ${selectedRoleData.color} text-white mb-2`}>
                <selectedRoleData.icon className="w-6 h-6" />
              </div>
              <p className="text-gray-600">{selectedRoleData.label}</p>
              <p className="text-sm text-gray-400 mt-1">أدخل PIN مكون من 4 أرقام</p>
            </div>

            {/* PIN Display */}
            <div className="flex justify-center gap-3 mb-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-12 h-14 rounded-lg border-2 flex items-center justify-center text-2xl font-bold transition-all ${
                    i < pin.length
                      ? 'border-[#1B2A4A] bg-[#1B2A4A] text-white'
                      : 'border-gray-300 text-gray-400'
                  }`}
                >
                  {i < pin.length ? '•' : ''}
                </div>
              ))}
            </div>

            {/* PIN Pad */}
            <div className="grid grid-cols-3 gap-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'مسح', '0', 'دخول'].map((key) => (
                <button
                  key={key}
                  onClick={() => {
                    if (key === 'مسح') clearPin();
                    else if (key === 'دخول') verifyPin();
                    else handlePinDigit(key);
                  }}
                  disabled={loading && key === 'دخول'}
                  className={`py-4 rounded-lg text-lg font-medium transition-all ${
                    key === 'دخول'
                      ? 'bg-[#1B2A4A] text-white hover:opacity-90'
                      : key === 'مسح'
                      ? 'bg-red-50 text-red-600 hover:bg-red-100'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  } disabled:opacity-50`}
                >
                  {key === 'دخول' && loading ? '...' : key}
                </button>
              ))}
            </div>

            <button
              onClick={() => { setStep('role'); setPin(''); }}
              className="w-full text-gray-500 text-sm hover:text-gray-700 py-2"
            >
              ← رجوع
            </button>
          </div>
        )}
      </div>
    </div>
  );
}