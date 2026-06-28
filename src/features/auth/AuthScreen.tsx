// ============================================================
// CORE SYSTEM v2.1 — AuthScreen
// VIEW ONLY. NO Business Logic. NO supabase.rpc(). NO supabase.from().
// Constitution §12: AuthScreen → useAuth → Supabase. NOT AuthScreen → Supabase directly.
// Blueprint: AuthScreen is a View. useAuth is the Controller.
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

/**
 * AuthScreen — Two-Step Authentication Flow:
 * Step 1: License Key Validation (clinic identification)
 * Step 2: PIN + Role Selection (staff authentication)
 * 
 * SECURITY NOTE: The actual role comes from the database via validate_pin RPC.
 * UI role selection is a UX hint only. If the user selects a different role
 * than their actual role, a warning is shown but login proceeds (PIN is the
 * source of truth per Constitution §9.6).
 */
export default function AuthScreen() {
  const navigate = useNavigate();
  const { 
    validateLicense, 
    loginWithPin, 
    logout,
    isLoading, 
    error, 
    status,
    tenant_id,
    user,
    isAuthenticated,
    clearError,
  } = useAuth();

  // Local UI state only
  const [licenseKey, setLicenseKey] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole | ''>('');
  const [step, setStep] = useState<1 | 2>(1);
  const [roleMismatch, setRoleMismatch] = useState(false);

  const isPinLocked = useAuthStore(selectIsPinLocked);
  const attemptsRemaining = useAuthStore(selectPinAttemptsRemaining);

  // ── Redirect if already authenticated ──
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      const route = getDefaultRoute(user.role);
      navigate(route, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // ── Step 1: Validate License ──
  const handleLicenseSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();

    const trimmedKey = licenseKey.trim();
    if (!trimmedKey) {
      return;
    }

    const result = await validateLicense(trimmedKey);
    
    if (result.success) {
      setStep(2);
    } else {
      // Error is already set in useAuth store, but ensure it's visible
      // The error will be displayed via the error Alert below
    }
  }, [licenseKey, validateLicense, clearError]);

  // ── Step 2: PIN Login ──
  const handlePinSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setRoleMismatch(false);

    const trimmedPin = pinCode.trim();
    if (!trimmedPin || trimmedPin.length !== 4) {
      return;
    }
    if (!selectedRole) {
      return;
    }

    const result = await loginWithPin(trimmedPin);
    
    if (result.success && result.user) {
      // Check role mismatch (security UX warning)
      if (result.user.role !== selectedRole) {
        setRoleMismatch(true);
        // Login still proceeds — PIN is the source of truth per Constitution §9.6
        // The actual role from database determines routing and permissions
      }

      // Navigate to role-specific dashboard
      const route = getDefaultRoute(result.user.role as UserRole);
      navigate(route, { replace: true });
    }
    // If !result.success, error is set in useAuth store and displayed via Alert
  }, [pinCode, selectedRole, loginWithPin, clearError, navigate]);

  // ── Handle PIN input (4 digits only) ──
  const handlePinChange = useCallback((value: string) => {
    // Only allow 4 digits
    const digitsOnly = value.replace(/\D/g, '').slice(0, 4);
    setPinCode(digitsOnly);
  }, []);

  // ── Reset / Logout ──
  const handleReset = useCallback(() => {
    clearError();
    setRoleMismatch(false);
    logout();
    setStep(1);
    setLicenseKey('');
    setPinCode('');
    setSelectedRole('');
  }, [logout, clearError]);

  // ── Render ──
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4" dir="rtl">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-[#1B2A4A]">
            CORE SYSTEM v2.1
          </CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            {step === 1 ? 'تسجيل الدخول — الخطوة ١: الترخيص' : 'تسجيل الدخول — الخطوة ٢: PIN + الدور'}
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Role Mismatch Warning */}
          {roleMismatch && (
            <Alert variant="warning" className="bg-amber-50 border-amber-200">
              <AlertDescription className="text-amber-800">
                ⚠️ الدور المختار ({selectedRole}) لا يطابق الدور المسجل في النظام. 
                تم تسجيل الدخول بالدور الصحيح من قاعدة البيانات.
              </AlertDescription>
            </Alert>
          )}

          {/* Step 1: License Key */}
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

          {/* Step 2: PIN + Role */}
          {step === 2 && (
            <form onSubmit={handlePinSubmit} className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <Label>الدور الوظيفي</Label>
                <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
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

              {/* PIN Input */}
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
                  <p className="text-xs text-red-600">
                    تم قفل المحاولات. يرجى الانتظار.
                  </p>
                )}
                {!isPinLocked && attemptsRemaining < 5 && (
                  <p className="text-xs text-amber-600">
                    محاولات متبقية: {attemptsRemaining}
                  </p>
                )}
              </div>

              <Button 
                type="submit" 
                className="w-full bg-[#1B2A4A] hover:bg-[#2a3d6b]"
                disabled={
                  isLoading || 
                  pinCode.length !== 4 || 
                  !selectedRole || 
                  isPinLocked
                }
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

          {/* Debug Info (DEV only, minimal) */}
          {import.meta.env.DEV && tenant_id && (
            <div className="mt-4 p-2 bg-gray-100 rounded text-xs text-gray-500 font-mono">
              <p>tenant_id: {tenant_id}</p>
              <p>status: {status}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
