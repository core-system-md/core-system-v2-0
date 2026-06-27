import { useState } from 'react';
import { supabase } from '@/infrastructure/supabase/client';
import { useAuthStore } from '@/shared/store/authStore';

const ROLES = [
  { id: 'doctor' as const, label: 'Doctor', labelAr: 'طبيب', color: '#1B2A4A' },
  { id: 'receptionist' as const, label: 'Reception', labelAr: 'استقبال', color: '#059669' },
  { id: 'clinic_admin' as const, label: 'Admin', labelAr: 'مدير', color: '#d97706' },
  { id: 'super_admin' as const, label: 'Super Admin', labelAr: 'مشرف عام', color: '#dc2626' },
];

type RoleId = typeof ROLES[number]['id'];

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
    padding: '16px',
    fontFamily: 'system-ui, -apple-system, sans-serif',
  },
  card: {
    width: '100%',
    maxWidth: '400px',
    background: 'white',
    borderRadius: '16px',
    padding: '32px',
    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)',
    border: '1px solid #e2e8f0',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#1B2A4A',
    textAlign: 'center',
    marginBottom: '8px',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
    marginBottom: '24px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '500',
    color: '#334155',
    marginBottom: '4px',
  },
  input: {
    width: '100%',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #cbd5e1',
    fontSize: '16px',
    textAlign: 'center',
    marginBottom: '16px',
    boxSizing: 'border-box',
    fontFamily: 'monospace',
    letterSpacing: '2px',
  },
  button: {
    width: '100%',
    padding: '14px',
    borderRadius: '8px',
    border: 'none',
    background: '#1B2A4A',
    color: 'white',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: '500',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  error: {
    padding: '12px',
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    color: '#dc2626',
    fontSize: '14px',
    textAlign: 'center',
    marginBottom: '16px',
  },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '12px',
    marginBottom: '16px',
  },
  roleButton: {
    padding: '20px 16px',
    borderRadius: '12px',
    border: '2px solid #e2e8f0',
    background: 'white',
    cursor: 'pointer',
    textAlign: 'center',
    transition: 'all 0.2s',
  },
  roleIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
  roleLabel: {
    fontWeight: '500',
    color: '#334155',
    fontSize: '14px',
    marginBottom: '2px',
  },
  roleLabelAr: {
    fontSize: '12px',
    color: '#94a3b8',
  },
  pinDisplay: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
    marginBottom: '24px',
  },
  pinDot: {
    width: '48px',
    height: '56px',
    borderRadius: '8px',
    border: '2px solid #cbd5e1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#cbd5e1',
    transition: 'all 0.2s',
  },
  pinDotFilled: {
    background: '#1B2A4A',
    borderColor: '#1B2A4A',
    color: 'white',
  },
  keypad: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gap: '8px',
    marginBottom: '16px',
  },
  key: {
    padding: '18px',
    borderRadius: '8px',
    border: 'none',
    background: '#f1f5f9',
    fontSize: '20px',
    fontWeight: '600',
    cursor: 'pointer',
    color: '#334155',
    transition: 'background 0.15s',
  },
  backLink: {
    textAlign: 'center',
    color: '#64748b',
    fontSize: '14px',
    cursor: 'pointer',
    background: 'none',
    border: 'none',
    width: '100%',
    padding: '8px',
  },
  loading: {
    textAlign: 'center',
    color: '#1B2A4A',
    fontSize: '14px',
    padding: '8px',
  },
  logoBox: {
    width: '64px',
    height: '64px',
    background: '#1B2A4A',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 16px',
    fontSize: '28px',
  },
  roleHeaderBox: {
    width: '56px',
    height: '56px',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 12px',
    fontSize: '28px',
  },
};

export default function AuthScreen() {
  const [licenseKey, setLicenseKey] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'license' | 'role' | 'pin'>('license');

  const { setUser, setTenant } = useAuthStore();

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  const verifyLicense = async () => {
    if (!licenseKey.trim()) {
      setError('يرجى إدخال مفتاح الترخيص');
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
    } catch (err) {
      setError('خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  const verifyPin = async () => {
    if (!selectedRole || pin.length !== 4) {
      setError('يرجى إدخال رمز PIN مكون من 4 أرقام');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const tenant = useAuthStore.getState().tenant;
      if (!tenant) {
        setError('خطأ في الجلسة');
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
        setPin('');
        setLoading(false);
        return;
      }

      if (data?.reason === 'RATE_LIMITED') {
        setError('تم تجاوز عدد المحاولات المسموح، حاول بعد 15 دقيقة');
        setPin('');
        setLoading(false);
        return;
      }

      if (!data?.success || !data?.user_id) {
        setError('رمز PIN غير صحيح');
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

      const routes: Record<RoleId, string> = {
        doctor: '/doctor',
        receptionist: '/reception',
        clinic_admin: '/clinic_admin',
        super_admin: '/super_admin',
      };

      navigateTo(routes[selectedRole]);
    } catch (err) {
      console.error('Auth error:', err);
      setError('حدث خطأ غير متوقع');
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
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={styles.logoBox}>🛡️</div>
            <h1 style={styles.title}>CORE SYSTEM</h1>
            <p style={styles.subtitle}>نظام إدارة العيادات الذكي</p>
          </div>

          <div>
            <label style={styles.label}>
              مفتاح الترخيص / License Key
            </label>
            <input
              type="text"
              placeholder="DEMO-LICENSE-2024"
              value={licenseKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLicenseKey(e.target.value)}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && verifyLicense()}
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            onClick={verifyLicense}
            disabled={loading || !licenseKey.trim()}
            style={{
              ...styles.button,
              ...(loading || !licenseKey.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {loading ? '⏳' : 'التالي →'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'role') {
    const tenant = useAuthStore.getState().tenant;
    const roleEmojis: Record<RoleId, string> = {
      doctor: '🩺',
      receptionist: '👥',
      clinic_admin: '🛡️',
      super_admin: '👑',
    };

    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h2 style={{ ...styles.title, fontSize: '20px' }}>اختر دورك</h2>
          <p style={styles.subtitle}>{tenant?.nameAr || tenant?.name}</p>

          <div style={styles.roleGrid}>
            {ROLES.map((role) => (
              <button
                key={role.id}
                onClick={() => handleRoleSelect(role.id)}
                style={styles.roleButton}
                onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.borderColor = role.color;
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
                  e.currentTarget.style.borderColor = '#e2e8f0';
                  e.currentTarget.style.background = 'white';
                }}
              >
                <div style={styles.roleIcon}>{roleEmojis[role.id]}</div>
                <div style={styles.roleLabel}>{role.label}</div>
                <div style={styles.roleLabelAr}>{role.labelAr}</div>
              </button>
            ))}
          </div>

          <button onClick={handleBack} style={styles.backLink}>← رجوع</button>
        </div>
      </div>
    );
  }

  const selectedRoleData = ROLES.find(r => r.id === selectedRole);
  const roleEmojis: Record<RoleId, string> = {
    doctor: '🩺',
    receptionist: '👥',
    clinic_admin: '🛡️',
    super_admin: '👑',
  };

  return (
    <div style={styles.container}>
      <div style={{ ...styles.card, maxWidth: '360px' }}>
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{
            ...styles.roleHeaderBox,
            background: (selectedRoleData?.color || '#1B2A4A') + '15',
          }}>
            {selectedRole ? roleEmojis[selectedRole] : '🛡️'}
          </div>
          <h2 style={{ ...styles.title, fontSize: '18px' }}>
            {selectedRoleData?.labelAr} - {selectedRoleData?.label}
          </h2>
          <p style={styles.subtitle}>أدخل رمز PIN المكون من 4 أرقام</p>
        </div>

        <div style={styles.pinDisplay}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                ...styles.pinDot,
                ...(i < pin.length ? styles.pinDotFilled : {}),
              }}
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
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            if (val.length === 4) setTimeout(() => verifyPin(), 100);
          }}
          style={{ position: 'absolute', opacity: 0, width: 0, height: 0 }}
          autoFocus
        />

        <div style={styles.keypad}>
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
              style={styles.key}
              onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = '#e2e8f0';
              }}
              onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
                e.currentTarget.style.background = '#f1f5f9';
              }}
            >
              {num}
            </button>
          ))}
          <button onClick={handleBack} style={styles.key}>رجوع</button>
          <button
            onClick={() => {
              if (pin.length < 4) {
                const newPin = pin + '0';
                setPin(newPin);
                if (newPin.length === 4) setTimeout(() => verifyPin(), 100);
              }
            }}
            style={styles.key}
            onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = '#e2e8f0';
            }}
            onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = '#f1f5f9';
            }}
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            style={styles.key}
            onMouseDown={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = '#e2e8f0';
            }}
            onMouseUp={(e: React.MouseEvent<HTMLButtonElement>) => {
              e.currentTarget.style.background = '#f1f5f9';
            }}
          >
            ⌫
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {loading && <div style={styles.loading}>⏳ جاري التحقق...</div>}
      </div>
    </div>
  );
}
