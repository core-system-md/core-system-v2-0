// ============================================================
// AuthScreen.tsx — CORE SYSTEM v2.1
// FIXED: 2026-06-25 — Uses AuthProvider.signInWithPin() directly
// ============================================================

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth/AuthProvider";
import { Shield, Mail, KeyRound, UserCircle } from "lucide-react";

const ROLES = [
  { value: "doctor", label: "طبيب", pin: "5678" },
  { value: "receptionist", label: "موظف استقبال", pin: "0000" },
  { value: "clinic_admin", label: "مدير العيادة", pin: "1234" },
  { value: "super_admin", label: "مدير النظام", pin: "9999" },
];

const LICENSE_KEY = "DEMO-LICENSE-2024";

export default function AuthScreen() {
  const navigate = useNavigate();
  const { signInWithPin, signInWithEmail } = useAuth();
  const [mode, setMode] = useState<"pin" | "email">("pin");
  const [licenseKey, setLicenseKey] = useState(LICENSE_KEY);
  const [selectedRole, setSelectedRole] = useState("doctor");
  const [pin, setPin] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handlePinLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      // CRITICAL FIX: Use AuthProvider.signInWithPin() directly
      const result = await signInWithPin(pin, selectedRole);

      if (result.success && result.role) {
        console.log("[AuthScreen] PIN login success, navigating to:", `/${result.role}`);
        navigate(`/${result.role}`);
      } else {
        setError(result.error || "فشل تسجيل الدخول");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ غير متوقع");
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      await signInWithEmail(email, password);
      navigate("/doctor");
    } catch (err) {
      setError(err instanceof Error ? err.message : "فشل تسجيل الدخول");
    } finally {
      setIsLoading(false);
    }
  };

  const currentRole = ROLES.find(r => r.value === selectedRole);

  return (
    <div className="min-h-screen bg-[#1B2A4A] flex items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">CORE SYSTEM</h1>
          <p className="text-white/60 mt-1">Clinic Management Portal</p>
        </div>

        {/* Online Badge */}
        <div className="flex justify-center mb-6">
          <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Online Mode
          </span>
        </div>

        {/* Login Card */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-white/10 p-6">
          <h2 className="text-xl font-semibold text-white text-center mb-6">Staff Login</h2>

          {/* Mode Toggle */}
          <div className="flex bg-white/5 rounded-lg p-1 mb-6">
            <button
              onClick={() => setMode("pin")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "pin" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              <KeyRound className="w-4 h-4 inline-block ml-2" />
              PIN
            </button>
            <button
              onClick={() => setMode("email")}
              className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === "email" ? "bg-white/10 text-white" : "text-white/50 hover:text-white/70"
              }`}
            >
              <Mail className="w-4 h-4 inline-block ml-2" />
              Email
            </button>
          </div>

          {/* License Key */}
          <div className="mb-4">
            <label className="block text-white/70 text-sm mb-2">Clinic License Key</label>
            <input
              type="text"
              value={licenseKey}
              onChange={(e) => setLicenseKey(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
              placeholder="Enter license key"
            />
          </div>

          {mode === "pin" ? (
            <>
              {/* Role Selection */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Select Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.map((role) => (
                    <button
                      key={role.value}
                      onClick={() => {
                        setSelectedRole(role.value);
                        setPin(role.pin);
                      }}
                      className={`p-3 rounded-lg border text-sm transition-colors ${
                        selectedRole === role.value
                          ? "bg-white/15 border-white/30 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:bg-white/10"
                      }`}
                    >
                      <UserCircle className="w-4 h-4 mx-auto mb-1" />
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* PIN Input */}
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">PIN Code</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white text-center text-2xl tracking-[0.5em] placeholder-white/30 focus:outline-none focus:border-white/30"
                  placeholder="••••"
                />
                {currentRole && (
                  <p className="text-white/30 text-xs mt-2 text-center">
                    Test PIN for {currentRole.label}: {currentRole.pin}
                  </p>
                )}
              </div>

              {/* Login Button */}
              <button
                onClick={handlePinLogin}
                disabled={isLoading || pin.length !== 4}
                className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  "تسجيل الدخول"
                )}
              </button>
            </>
          ) : (
            <>
              {/* Email Input */}
              <div className="mb-4">
                <label className="block text-white/70 text-sm mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                  placeholder="doctor@clinic.com"
                />
              </div>

              {/* Password Input */}
              <div className="mb-6">
                <label className="block text-white/70 text-sm mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/30"
                  placeholder="••••••••"
                />
              </div>

              {/* Login Button */}
              <button
                onClick={handleEmailLogin}
                disabled={isLoading || !email || !password}
                className="w-full bg-white/10 hover:bg-white/20 disabled:bg-white/5 disabled:text-white/30 text-white font-medium py-3 rounded-lg transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    جاري تسجيل الدخول...
                  </span>
                ) : (
                  "تسجيل الدخول"
                )}
              </button>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-sm text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-white/30 text-xs text-center mt-6">
          CORE SYSTEM v2.1 — All Rights Reserved
        </p>
      </div>
    </div>
  );
}