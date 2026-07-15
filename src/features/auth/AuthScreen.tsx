// ============================================================
// CORE SYSTEM v2.1 — AuthScreen
// VIEW ONLY. NO Business Logic. NO supabase.rpc(). NO supabase.from().
// Constitution §12: AuthScreen → useAuth → Supabase. NOT AuthScreen → Supabase directly.
// FIXED: 2026-07-14 — Remove selectedRole from loginWithPin (role comes from DB only)
// FIXED: 2026-07-15 — Remove unused Select imports (BUG 9 cleanup)
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useAuthStore, selectIsPinLocked, selectPinAttemptsRemaining } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';
import type { AuthUser } from '@/shared/store/authStore';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

export default function AuthScreen() {
  const navigate = useNavigate();
  const {
    validateLicense,
    loginWithPin,
    loginWithEmail,
    logout,
    isChecking,
    error,
    clearError,
  } = useAuth();

  const tenant_id = useAuthStore((s) => s.tenant_id);
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [licenseKey, setLicenseKey] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [loginMethod, setLoginMethod] = useState<'pin' | 'email'>('pin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const isPinLocked = useAuthStore(selectIsPinLocked);
  const attemptsRemaining = useAuthStore(selectPinAttemptsRemaining);

  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const route = getDefaultRoute(user.role);
      navigate(route, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLicenseSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) return;
    const result = await validateLicense(trimmedKey);
    if (result.success) {
      setStep(2);
    }
  }, [licenseKey, validateLicense, clearError]);

  const handlePinSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    const trimmedPin = pinCode.trim();
    if (!trimmedPin || trimmedPin.length !== 4) return;

    // DEBUG: Trace before loginWithPin
    console.log('[AUTH SCREEN] before loginWithPin', {
      pinLength: trimmedPin.length,
    });

    const result = await loginWithPin(trimmedPin);

    // DEBUG: Trace after loginWithPin
    console.log('[AUTH SCREEN] loginWithPin result', result);

    if (result.success) {
      const pinResult = result as { success: true; user: AuthUser };
      const route = getDefaultRoute(pinResult.user.role);
      navigate(route, { replace: true });
    }
  }, [pinCode, loginWithPin, clearError, navigate]);

  const handleEmailSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (!email || !password) return;
    const result = await (loginWithEmail ? loginWithEmail(email, password) : Promise.resolve({ success: false }));
    console.log('[AUTH SCREEN] loginWithEmail result', result);
    if (result.success) {
      const emailResult = result as { success: true; user: AuthUser };
      const route = getDefaultRoute(emailResult.user.role);
      navigate(route, { replace: true });
    }
  }, [email, password, clearError, loginWithEmail, navigate]);

  const handlePinChange = useCallback((value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(digitsOnly);
  }, []);

  const handleReset = useCallback(() => {
    clearError();
    logout();
    setStep(1);
    setLicenseKey('');
    setPinCode('');
  }, [logout, clearError]);

  // ── DEV MODE: Instant login ──
  const handleDevMode = useCallback(async () => {
    clearError();
    await validateLicense('DEV-MODE-2026');
    const result = await loginWithPin('1234');
    if (result.success) {
      const devResult = result as { success: true; user: AuthUser };
      const route = getDefaultRoute(devResult.user.role);
      navigate(route, { replace: true });
    }
  }, [validateLicense, loginWithPin, clearError, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#1B2A4A]">CORE SYSTEM v2.1</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 ? 'تسجيل الدخول — الخطوة ١: الترخيص' : 'تسجيل الدخول — الخطوة ٢: PIN + الدور'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* ── DEV MODE Buttons ── */}
          {import.meta.env.DEV && step === 1 && (
            <div className="space-y-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-600 font-bold text-center">🚀 وضع التطوير — تسجيل الدخول الفوري</p>
              <Button type="button" variant="outline" onClick={handleDevMode} className="w-full text-xs">
                تسجيل الدخول الفوري (وضع التطوير)
              </Button>
            </div>
          )}

          {step === 1 && (
            <form onSubmit={handleLicenseSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="license">مفتاح الترخيص</Label>
                <Input
                  id="license"
                  type="text"
                  placeholder="أدخل مفتاح الترخيص..."
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  disabled={isChecking}
                  className="text-center tracking-widest"
                  autoComplete="off"
                />
              </div>
              <Button
                type="submit"
                className="w-full bg-[#1B2A4A] hover:bg-[#2a3d6b]"
                disabled={isChecking || !licenseKey.trim()}
              >
                {isChecking ? 'جاري التحقق...' : 'التحقق من الترخيص'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={loginMethod === 'pin' ? 'default' : 'ghost'}
                  onClick={() => setLoginMethod('pin')}
                  className="flex-1"
                >
                  تسجيل باستخدام PIN
                </Button>
                <Button
                  type="button"
                  variant={loginMethod === 'email' ? 'default' : 'ghost'}
                  onClick={() => setLoginMethod('email')}
                  className="flex-1"
                >
                  تسجيل باستخدام البريد
                </Button>
              </div>

              {loginMethod === 'pin' && (
                <form onSubmit={handlePinSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="pin">رمز PIN (4 أرقام)</Label>
                    <Input
                      id="pin"
                      type="password"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={4}
                      placeholder="• • • •"
                      value={pinCode}
                      onChange={(e) => handlePinChange(e.target.value)}
                      disabled={isChecking || isPinLocked}
                      className="text-center text-2xl tracking-[0.5em]"
                      autoComplete="off"
                    />
                    {isPinLocked && (
                      <p className="text-xs text-red-600">تم قفل المحاولات. يرجى الانتظار.</p>
                    )}
                    {!isPinLocked && attemptsRemaining < 5 && (
                      <p className="text-xs text-amber-600">محاولات متبقية: {attemptsRemaining}</p>
                    )}
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#1B2A4A] hover:bg-[#2a3d6b]"
                    disabled={isChecking || pinCode.length !== 4 || isPinLocked}
                  >
                    {isChecking ? 'جاري التحقق...' : 'تسجيل الدخول'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleReset}
                    disabled={isChecking}
                  >
                    العودة — إدخال ترخيص آخر
                  </Button>
                </form>
              )}

              {loginMethod === 'email' && (
                <form onSubmit={handleEmailSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="example@clinic.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isChecking}
                      autoComplete="email"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="password">كلمة المرور</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isChecking}
                      autoComplete="current-password"
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-[#1B2A4A] hover:bg-[#2a3d6b]"
                    disabled={isChecking || !email || !password}
                  >
                    {isChecking ? 'جاري التحقق...' : 'تسجيل الدخول'}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={handleReset}
                    disabled={isChecking}
                  >
                    العودة — إدخال ترخيص آخر
                  </Button>
                </form>
              )}
            </div>
          )}

          {import.meta.env.DEV && tenant_id && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500 font-mono">
              <p>tenant_id: {tenant_id}</p>
              <p>status: {authStatus}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}