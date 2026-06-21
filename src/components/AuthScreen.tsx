import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/core/auth/useAuth";
import { useNetworkStatus } from "@/shared/hooks/useNetworkStatus";
import { Wifi, WifiOff, Shield, Mail, Lock, KeyRound, Eye, EyeOff, AlertCircle, ArrowRight, Building2 } from "lucide-react";

export default function AuthScreen() {
  const navigate = useNavigate();
  const { login, isPending } = useAuth();
  const { isOnline } = useNetworkStatus();

  const [activeTab, setActiveTab] = useState<"email" | "pin">("email");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [licenseKey, setLicenseKey] = useState("");
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [pinIndex, setPinIndex] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [shake, setShake] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const getRoleRoute = (role: string | null) => {
    const routes: Record<string, string> = {
      receptionist: '/reception',
      doctor: '/doctor',
      clinic_admin: '/admin',
      super_admin: '/super-admin',
    };
    return routes[role || ''] || '/reception';
  };

  const handleEmailLogin = useCallback(async () => {
    if (!email || !password || !licenseKey) {
      setLocalError("Please enter email, password, and license key");
      return;
    }
    setLocalError(null);
    try {
      const result = await login.mutateAsync({ email, password, licenseKey });
      const userRole = result?.role || 'receptionist';
      navigate(getRoleRoute(userRole));
    } catch (err: any) {
      setLocalError(err.message || "Invalid credentials or license");
      setShake(true);
      setTimeout(() => setShake(false), 500);
    }
  }, [email, password, licenseKey, login, navigate]);

  const handlePinLogin = async (enteredPin: string) => {
    if (!licenseKey) {
      setLocalError("License key required for PIN login");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin(["", "", "", ""]);
      setPinIndex(0);
      return;
    }
    setLocalError(null);
    try {
      const result = await login.mutateAsync({ pinCode: enteredPin, licenseKey });
      const userRole = result?.role || 'receptionist';
      navigate(getRoleRoute(userRole));
    } catch (err: any) {
      setLocalError(err.message || "Invalid PIN");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin(["", "", "", ""]);
      setPinIndex(0);
    }
  };

  const handlePinPress = useCallback((key: string) => {
    if (isPending) return;
    if (key === "backspace") {
      if (pinIndex > 0) {
        const newPin = [...pin];
        newPin[pinIndex - 1] = "";
        setPin(newPin);
        setPinIndex(pinIndex - 1);
      }
      return;
    }
    if (key === "clear") {
      setPin(["", "", "", ""]);
      setPinIndex(0);
      return;
    }
    if (pinIndex < 4) {
      const newPin = [...pin];
      newPin[pinIndex] = key;
      setPin(newPin);
      setPinIndex(pinIndex + 1);
      if (pinIndex === 3) handlePinLogin(newPin.join(""));
    }
  }, [pin, pinIndex, isPending]);

  const keypadKeys = [["1","2","3"],["4","5","6"],["7","8","9"],["clear","0","backspace"]];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B2A4A] via-[#243656] to-[#1B2A4A] text-white flex flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-20 h-20 md:w-24 md:h-24 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-4 border border-white/20">
            <Shield className="w-10 h-10 md:w-12 md:h-12 text-white/90" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">CORE SYSTEM</h1>
          <p className="text-base md:text-lg text-white/60 mt-2">Clinic Management Portal</p>
        </div>
        <div className="flex justify-center mb-6">
          <span className={`text-sm px-3 py-1 rounded-full border ${isOnline ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30" : "bg-red-500/20 text-red-300 border-red-500/30"}`}>
            {isOnline ? <Wifi className="w-4 h-4 inline mr-1" /> : <WifiOff className="w-4 h-4 inline mr-1" />}
            {isOnline ? "Online Mode" : "Offline Mode"}
          </span>
        </div>
        {localError && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <p className="text-red-300 text-sm">{localError}</p>
          </div>
        )}
        <div className={`bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl shadow-2xl overflow-hidden ${shake ? "animate-shake" : ""}`}>
          <div className="p-6">
            <h2 className="text-xl md:text-2xl text-center text-white/90 font-semibold mb-6">Staff Login</h2>
            <div className="mb-6 space-y-2">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Clinic License Key
              </label>
              <input type="text" placeholder="XXXX-XXXX-XXXX" value={licenseKey} onChange={(e) => setLicenseKey(e.target.value.toUpperCase())} className="w-full h-12 md:h-14 text-base md:text-lg bg-white/5 border border-white/20 text-white placeholder:text-white/30 rounded-lg px-4 focus:outline-none focus:border-white/40 uppercase tracking-widest" />
            </div>
            <div className="grid grid-cols-2 gap-2 bg-white/10 rounded-lg p-1 mb-6">
              <button onClick={() => setActiveTab("email")} className={`py-2 px-4 rounded-md text-sm md:text-base font-medium transition-all ${activeTab === "email" ? "bg-white text-[#1B2A4A]" : "text-white/70 hover:text-white"}`}><Mail className="w-4 h-4 inline mr-2" />Email</button>
              <button onClick={() => setActiveTab("pin")} className={`py-2 px-4 rounded-md text-sm md:text-base font-medium transition-all ${activeTab === "pin" ? "bg-white text-[#1B2A4A]" : "text-white/70 hover:text-white"}`}><KeyRound className="w-4 h-4 inline mr-2" />PIN</button>
            </div>
            {activeTab === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 flex items-center gap-2"><Mail className="w-4 h-4" /> Email Address</label>
                  <input type="email" placeholder="doctor@coresystem.io" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full h-12 md:h-14 text-base md:text-lg bg-white/5 border border-white/20 text-white placeholder:text-white/30 rounded-lg px-4 focus:outline-none focus:border-white/40" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70 flex items-center gap-2"><Lock className="w-4 h-4" /> Password</label>
                  <div className="relative">
                    <input type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full h-12 md:h-14 text-base md:text-lg bg-white/5 border border-white/20 text-white placeholder:text-white/30 rounded-lg px-4 pr-12 focus:outline-none focus:border-white/40" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white/80">{showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}</button>
                  </div>
                </div>
                <button onClick={handleEmailLogin} disabled={!email || !password || !licenseKey || isPending} className="w-full h-14 md:h-16 text-lg md:text-xl font-bold bg-white text-[#1B2A4A] hover:bg-white/90 disabled:opacity-50 rounded-xl flex items-center justify-center gap-2">
                  {isPending ? <div className="w-6 h-6 border-4 border-[#1B2A4A]/20 border-t-[#1B2A4A] rounded-full animate-spin" /> : <><span>Sign In</span><ArrowRight className="w-5 h-5" /></>}
                </button>
              </div>
            )}
            {activeTab === "pin" && (
              <div className="space-y-4">
                <p className="text-center text-white/60 text-sm md:text-base mb-2">Enter your 4-digit staff PIN</p>
                <div className="flex justify-center gap-3 mb-4">
                  {[0,1,2,3].map((i) => (
                    <div key={i} className={`w-12 h-12 md:w-16 md:h-16 rounded-xl flex items-center justify-center transition-all duration-200 ${i === pinIndex ? "bg-white/20 border-2 border-white/40 shadow-lg" : pin[i] ? "bg-white/15 border-2 border-white/30" : "bg-white/5 border-2 border-white/10"}`}>
                      {pin[i] ? <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-white" /> : <span className="text-white/20 text-lg">{i+1}</span>}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {keypadKeys.flat().map((key) => (
                    <button key={key} onClick={() => handlePinPress(key)} disabled={isPending} className={`h-14 md:h-16 text-white font-bold rounded-xl transition-all active:scale-95 border border-white/20 ${key === "backspace" || key === "clear" ? "bg-white/10 hover:bg-white/20" : "bg-white/15 hover:bg-white/25 text-2xl"} disabled:opacity-30`}>
                      {isPending && key === "0" ? <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" /> : key === "backspace" ? <span className="text-lg md:text-xl font-bold">⌫</span> : key === "clear" ? <span className="text-xs md:text-sm font-bold">CLR</span> : <span className="text-2xl md:text-3xl font-bold">{key}</span>}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="mt-8 text-center">
          <p className="text-sm text-white/40">CORE SYSTEM v2.0 • Secure Authentication</p>
          <p className="text-xs text-white/30 mt-1">{isOnline ? "Connected to cloud" : "Working offline — sync when connected"}</p>
        </div>
      </div>
      <style>{`@keyframes shake { 0%,100% { transform: translateX(0); } 10%,30%,50%,70%,90% { transform: translateX(-6px); } 20%,40%,60%,80% { transform: translateX(6px); } } .animate-shake { animation: shake 0.4s ease-in-out; }`}</style>
    </div>
  );
}
