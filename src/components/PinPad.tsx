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
  allowedRoles = ["receptionist", "doctor", "admin", "super-admin"],
  title = "Staff Login",
  subtitle = "Enter your 4-digit PIN",
}: PinPadProps) {
  const { isLoading } = useAuth();
  const [pin, setPin] = useState<string[]>(["", "", "", ""]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [shake, setShake] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const [localError, setLocalError] = useState<string | null>(null);

  const MAX_ATTEMPTS = 5;
  const LOCKOUT_SECONDS = 30;

  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setInterval(() => {
        setLockTimer((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
    return undefined;
  }, [isLocked, lockTimer]);

  const handleKeyPress = useCallback(
    (key: string) => {
      if (isLocked || isLoading) return;

      if (key === "backspace") {
        if (activeIndex > 0) {
          const newPin = [...pin];
          newPin[activeIndex - 1] = "";
          setPin(newPin);
          setActiveIndex(activeIndex - 1);
        }
        return;
      }

      if (key === "clear") {
        setPin(["", "", "", ""]);
        setActiveIndex(0);
        return;
      }

      if (activeIndex < 4) {
        const newPin = [...pin];
        newPin[activeIndex] = key;
        setPin(newPin);
        setActiveIndex(activeIndex + 1);

        if (activeIndex === 3) {
          const fullPin = newPin.join("");
          void fullPin;
          handleSubmit(fullPin);
        }
      }
    },
    [pin, activeIndex, isLocked, isLoading]
  );

  const handleSubmit = async (fullPin: string) => {
    if (fullPin.length !== 4) return;
    setLocalError(null);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockRole = "doctor";
      
      if (allowedRoles.includes(mockRole)) {
        onSuccess?.("mock-user-id", mockRole);
      } else {
        setLocalError("Unauthorized role");
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin(["", "", "", ""]);
        setActiveIndex(0);
      }
    } catch {
      setAttempts((prev) => {
        const newAttempts = prev + 1;
        if (newAttempts >= MAX_ATTEMPTS) {
          setIsLocked(true);
          setLockTimer(LOCKOUT_SECONDS);
        }
        return newAttempts;
      });
      setLocalError("Invalid PIN");
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPin(["", "", "", ""]);
      setActiveIndex(0);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isLocked || isLoading) return;
      if (e.key >= "0" && e.key <= "9") handleKeyPress(e.key);
      else if (e.key === "Backspace") handleKeyPress("backspace");
      else if (e.key === "Escape") onCancel?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyPress, isLocked, isLoading, onCancel]);

  const keypadKeys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["clear", "0", "backspace"],
  ];

  const getKeyIcon = (key: string) => {
    if (key === "backspace") return <Delete className="w-6 h-6 md:w-8 md:h-8" />;
    if (key === "clear") return <span className="text-sm md:text-lg font-semibold">CLR</span>;
    return <span className="text-2xl md:text-4xl font-bold">{key}</span>;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1B2A4A] via-[#243656] to-[#1B2A4A] text-white flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl shadow-2xl">
        <div className="p-6 md:p-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 md:w-10 md:h-10 text-white/90" />
            </div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">{title}</h1>
            <p className="text-base md:text-lg text-white/60">{subtitle}</p>
          </div>

          {isLocked && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <div>
                <p className="font-semibold text-red-300">Too many attempts</p>
                <p className="text-sm text-red-300/70">Please wait {lockTimer} seconds</p>
              </div>
            </div>
          )}

          {localError && !isLocked && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{localError}</p>
            </div>
          )}

          <div className={`flex justify-center gap-3 md:gap-4 mb-8 ${shake ? "animate-shake" : ""}`}>
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                className={`w-14 h-14 md:w-20 md:h-20 rounded-xl flex items-center justify-center text-2xl md:text-4xl font-bold transition-all duration-200 ${
                  index === activeIndex && !isLocked
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

          {!isLocked && attempts > 0 && (
            <div className="text-center mb-4">
              <span className="bg-red-500/20 text-red-300 border border-red-500/30 text-sm px-3 py-1 rounded-full">
                Attempt {attempts} of {MAX_ATTEMPTS}
              </span>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3 md:gap-4">
            {keypadKeys.flat().map((key) => (
              <button
                key={key}
                onClick={() => handleKeyPress(key)}
                disabled={isLocked || isLoading}
                className={`h-16 md:h-20 text-white font-bold rounded-xl transition-all duration-150 active:scale-95 border border-white/20 ${
                  key === "backspace" || key === "clear"
                    ? "bg-white/10 hover:bg-white/20"
                    : "bg-white/15 hover:bg-white/25 text-2xl md:text-4xl"
                } disabled:opacity-30 disabled:cursor-not-allowed`}
              >
                {isLoading && key === "0" ? (
                  <div className="w-6 h-6 md:w-8 md:h-8 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
                ) : (
                  getKeyIcon(key)
                )}
              </button>
            ))}
          </div>

          {onCancel && (
            <button
              onClick={onCancel}
              className="w-full mt-6 h-14 md:h-16 text-white/60 hover:text-white hover:bg-white/10 text-lg md:text-xl font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 md:w-6 md:h-6" />
              Cancel
            </button>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-white/40">CORE SYSTEM v2.0 - Secure PIN Entry</p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
}
