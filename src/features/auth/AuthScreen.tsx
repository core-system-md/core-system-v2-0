// ============================================================
// CORE SYSTEM v2.1 — AuthScreen
// VIEW ONLY. NO Business Logic. NO supabase.rpc(). NO supabase.from().
// Constitution §12: AuthScreen → useAuth → Supabase. NOT AuthScreen → Supabase directly.
// Blueprint: AuthScreen is a View. useAuth is the Controller.
// FIXED: 2026-07-01 — Read tenant_id from authStore + localStorage fallback
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/core/auth/useAuth';
import { useAuthStore, selectIsPinLocked, selectPinAttemptsRemaining } from '@/shared/store/authStore';
import { getDefaultRoute } from '@/core/permissions/permissionMatrix';
import type { UserRole } from '@/shared/types/auth';

// UI Components (Shadcn/UI per Constitution §1)
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function AuthScreen() {
  const navigate = useNavigate();
  const { 
    validateLicense, 
    loginWithPin, 
    logout,
    isLoading, 
    error, 
    clearError,
  } = useAuth();

  // ✅ Read from authStore (primary) + localStorage (fallback)
  const storeTenantId = useAuthStore((s) => s.tenant_id);
  const tenant_id = storeTenantId || localStorage.getItem('tenant_id');
  const authStatus = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const [licenseKey, setLicenseKey] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [step, setStep] = useState<1 | 2>(1);
  const [roleMismatch, setRoleMismatch] = useState(false);

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
    setRoleMismatch(false);
    const trimmedPin = pinCode.trim();
    if (!trimmedPin || trimmedPin.length !== 4) return;
    if (!selectedRole) return;

    const result = await loginWithPin(trimmedPin, selectedRole);
    if (result.success && result.user) {
      if (result.user.role !== selectedRole) {
        setRoleMismatch(true);
      }
      const route = getDefaultRoute(result.user.role as UserRole);
      navigate(route, { replace: true });
    }
  }, [pinCode, selectedRole, loginWithPin, clearError, navigate]);

  const handlePinChange = useCallback((value: string) => {
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(digitsOnly);
  }, []);

  const handleReset = useCallback(() => {
    clearError();
    setRoleMismatch(false);
    logout();
    setStep(1);
    setLicenseKey('');
    setPinCode('');
    setSelectedRole('');
  }, [logout, clearError]);

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

          {roleMismatch && (
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                ⚠️ الدور المختار ({selectedRole}) لا يطابق الدور المسجل في النظام. 
                تم تسجيل الدخول بالدور الصحيح من قاعدة البيانات.
              </AlertDescription>
            </Alert>
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
                  disabled={isLoading}
                  className="text-center tracking-widest"
                  autoComplete="off"
                />
              </div>
              <Button 
                type="submit" 
                className="w-full bg-[#1B2A4A] hover:bg-[#2a3d6b]"
                disabled={isLoading || !licenseKey.trim()}
              >
                {isLoading ? 'جاري التحقق...' : 'التحقق من الترخيص'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>الدور الوظيفي</Label>
                <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الدور..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="doctor">طبيب</SelectItem>
                    <SelectItem value="receptionist">استقبال</SelectItem>
                    <SelectItem value="clinic_admin">مدير العيادة</SelectItem>
                    <SelectItem value="super_admin">مدير النظام</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-400">
                  اختيار الدور لتسهيل التجربة — الدور الفعلي يأتي من قاعدة البيانات
                </p>
              </div>

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
                  disabled={isLoading || isPinLocked}
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
                disabled={isLoading || pinCode.length !== 4 || !selectedRole || isPinLocked}
              >
                {isLoading ? 'جاري التحقق...' : 'تسجيل الدخول'}
              </Button>

              <Button 
                type="button" 
                variant="ghost" 
                className="w-full"
                onClick={handleReset}
                disabled={isLoading}
              >
                العودة — إدخال ترخيص آخر
              </Button>
            </form>
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
