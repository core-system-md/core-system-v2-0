import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/core/auth/useAuth";
import { ArrowLeft, Delete, Shield, AlertCircle } from "lucide-react";

interface PinPadProps {
  onSuccess?: (userId: string, role: string) => void;
  onCancel?: () => void;
  allowedRoles?: string[];
  title?: string;
  subtitle?: string;
}

export default function PinPad({
  onSuccess,
  onCancel,
  allowedRoles = ["receptionist", "doctor", "clinic_admin", "super_admin"],
  title = "دخول الموظف",
  subtitle = "أدخل رمز PIN المكوّن من 4 أرقام",
}: PinPadProps) {
  const { loginWithPin, logout, isChecking, isPinLocked, attemptsRemaining } = useAuth();
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const resetPin = useCallback(() => {
    setPin(["", "", "", ""]);
    setActiveIndex(0);
  }, []);

  const handleSubmit = useCallback(async (fullPin: string) => {
    if (!/^\d{4}$/.test(fullPin) || isPinLocked || isChecking) return;
    setLocalError(null);

    const result = await loginWithPin(fullPin);
    resetPin();

    if (!result.success) {
      setLocalError(result.error || "رمز PIN غير صحيح");
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }

    const user = result.user;
    if (!user || !allowedRoles.includes(user.role)) {
      await logout();
      setLocalError("هذا الدور غير مسموح له بالدخول من هذه الشاشة");
      setShake(true);
      window.setTimeout(() => setShake(false), 500);
      return;
    }

    onSuccess?.(user.id, user.role);
  }, [allowedRoles, isChecking, isPinLocked, loginWithPin, logout, onSuccess, resetPin]);

  const handleKeyPress = useCallback((key: string) => {
    if (isPinLocked || isChecking) return;

    if (key === "backspace") {
      if (activeIndex > 0) {
        setPin((current) => {
          const next = [...current];
          next[activeIndex - 1] = "";
          return next;
        });
        setActiveIndex((index) => index - 1);
      }
      return;
    }

    if (key === "clear") {
      resetPin();
      setLocalError(null);
      return;
    }

    if (!/^\d$/.test(key) || activeIndex >= 4) return;

    const next = [...pin];
    next[activeIndex] = key;
    const nextIndex = activeIndex + 1;
    setPin(next);
    setActiveIndex(nextIndex);

    if (nextIndex === 4) {
      void handleSubmit(next.join(""));
    }
  }, [activeIndex, handleSubmit, isChecking, isPinLocked, pin, resetPin]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key >= "0" && event.key <= "9") handleKeyPress(event.key);
      else if (event.key === "Backspace") handleKeyPress("backspace");
      else if (event.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, onCancel]);

  const keypadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "backspace"],
  ];

  const getKeyIcon = (key: string) => {
    if (key === "backspace") return <Delete className="w-6 h-6 md:w-8 md:h-8" />;
    if (key === "clear") return <span className="text-sm md:text-lg font-semibold">مسح</span>;
    return <span className="text-2xl md:text-4xl font-bold">{key}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B2A4A] via-[#243656] to-[#1B2A4A] text-white flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl shadow-2xl">
        <div className="p-6 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 md:w-10 md:h-10 text-white/90" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{title}</h1>
            <p className="text-base md:text-lg text-white/60">{subtitle}</p>
          </div>

          {isPinLocked && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-300">تم قفل PIN مؤقتًا</p>
                <p className="text-sm text-red-300/70">التحقق يتم فرضه من طبقة المصادقة وقاعدة البيانات.</p>
              </div>
            </div>
          )}

          {localError && !isPinLocked && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{localError}</p>
            </div>
          )}

          <div className={`flex justify-center gap-3 md:gap-4 mb-4 ${shake ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-14 h-14 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-2xl md:text-4xl font-bold transition-all duration-200 ${
                  index === activeIndex && !isPinLocked
                    ? "bg-white/20 border-2 border-white/40 shadow-lg shadow-white/10"
                    : pin[index]
                    ? "bg-white/15 border-2 border-white/30"
                    : "bg-white/5 border-2 border-white/10"
                }`}
              >
                {pin[index] ? (
                  <div className="w-3 h-3 md:w-4 md:h-4 rounded-full bg-white" />
                ) : (
                  <span className="text-white/20">{index + 1}</span>
                )}
              </div>
            ))}
          </div>

          {attemptsRemaining > 0 && !isPinLocked && (
            <div className="text-center mb-4">
              <span className="bg-white/10 text-white/70 border border-white/10 text-xs px-3 py-1 rounded-full">
                المحاولات المتبقية: {attemptsRemaining}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {keypadKeys.flat().map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleKeyPress(key)}
                disabled={isPinLocked || isChecking}
                className="h-16 md:h-20 text-white font-bold rounded-xl transition-all duration-150 active:scale-95 border border-white/20 bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                {isChecking && key === "0" ? (
                  <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                ) : getKeyIcon(key)}
              </button>
            ))}
          </div>

          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full mt-6 h-14 md:h-16 text-white/60 hover:text-white hover:bg-white/10 text-lg md:text-xl font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              رجوع
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake { animation: shake 0.5s ease-in-out; }
      `}</style>
    </div>
  );
}
