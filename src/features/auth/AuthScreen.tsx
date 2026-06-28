// src/features/auth/AuthScreen.tsx
// CORE SYSTEM v2.1 — Auth Screen (Constitution §12 compliant - View Only)

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth'; // We will create this hook

const ROLES = [
  { id: 'doctor' as const, label: 'Doctor', labelAr: 'طبيب', color: '#1B2A4A' },
  { id: 'receptionist' as const, label: 'Reception', labelAr: 'استقبال', color: '#059669' },
  { id: 'clinic_admin' as const, label: 'Admin', labelAr: 'مدير', color: '#d97706' },
  { id: 'super_admin' as const, label: 'Super Admin', labelAr: 'مشرف عام', color: '#dc2626' },
];

type RoleId = typeof ROLES[number]['id'];

// ... (Keeping the exact same styles object you provided, no UI changes) ...
const styles: Record<string, React.CSSProperties> = { /* ... same as your code ... */ };

export default function AuthScreen() {
  const [licenseKey, setLicenseKey] = useState('');
  const [selectedRole, setSelectedRole] = useState<RoleId | null>(null);
  const [pin, setPin] = useState('');
  const [step, setStep] = useState<'license' | 'role' | 'pin'>('license');

  const navigate = useNavigate();
  
  // Using the central useAuth hook (Business Logic Controller)
  const { verifyLicense, verifyPin, tenant, isLoading, error, clearError } = useAuth();

  const handleVerifyLicense = async () => {
    if (!licenseKey.trim()) return;
    clearError();
    const success = await verifyLicense(licenseKey.trim());
    if (success) setStep('role');
  };

  const handleVerifyPin = async (pinCode: string) => {
    if (!selectedRole || pinCode.length !== 4) return;
    clearError();
    const route = await verifyPin(pinCode, selectedRole);
    if (route) {
      navigate(route); // React Router navigation (No full page reload)
    }
  };

  const handleRoleSelect = (role: RoleId) => {
    setSelectedRole(role);
    setStep('pin');
    setPin('');
    clearError();
  };

  const handleBack = () => {
    clearError();
    if (step === 'pin') {
      setStep('role');
      setPin('');
      setSelectedRole(null);
    } else if (step === 'role') {
      setStep('license');
      setSelectedRole(null);
    }
  };

  const roleEmojis: Record<RoleId, string> = {
    doctor: '🩺',
    receptionist: '👥',
    clinic_admin: '🛡️',
    super_admin: '👑',
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
            <label style={styles.label}>مفتاح الترخيص / License Key</label>
            <input
              type="text"
              placeholder="DEMO-LICENSE-2024"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleVerifyLicense()}
              style={styles.input}
            />
          </div>

          {error && <div style={styles.error}>{error}</div>}

          <button
            onClick={handleVerifyLicense}
            disabled={isLoading || !licenseKey.trim()}
            style={{
              ...styles.button,
              ...(isLoading || !licenseKey.trim() ? styles.buttonDisabled : {}),
            }}
          >
            {isLoading ? '⏳' : 'التالي →'}
          </button>
        </div>
      </div>
    );
  }

  if (step === 'role') {
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
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = role.color;
                  e.currentTarget.style.background = '#f8fafc';
                }}
                onMouseLeave={(e) => {
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
          onChange={(e) => {
            const val = e.target.value.replace(/\D/g, '').slice(0, 4);
            setPin(val);
            if (val.length === 4) setTimeout(() => handleVerifyPin(val), 100);
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
                  if (newPin.length === 4) setTimeout(() => handleVerifyPin(newPin), 100);
                }
              }}
              style={styles.key}
              onMouseDown={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
              onMouseUp={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
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
                if (newPin.length === 4) setTimeout(() => handleVerifyPin(newPin), 100);
              }
            }}
            style={styles.key}
            onMouseDown={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseUp={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            0
          </button>
          <button
            onClick={() => setPin(pin.slice(0, -1))}
            style={styles.key}
            onMouseDown={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseUp={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            ⌫
          </button>
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {isLoading && <div style={styles.loading}>⏳ جاري التحقق...</div>}
      </div>
    </div>
  );
}
