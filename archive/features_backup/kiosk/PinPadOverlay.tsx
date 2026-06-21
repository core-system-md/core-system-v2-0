import { useState, useCallback } from "react";

interface PinPadOverlayProps {
  onUnlock: (pin: string) => void;
  onCancel: () => void;
  maxAttempts?: number;
}

export function PinPadOverlay({ onUnlock, onCancel, maxAttempts = 3 }: PinPadOverlayProps) {
  const [pin, setPin] = useState("");
  const [attempts, _setAttempts] = useState(0);
  const [shake, setShake] = useState(false);
  const [locked, _setLocked] = useState(false);

  const handleDigit = useCallback((digit: string) => {
    if (locked || pin.length >= 6) return;
    setPin((prev) => prev + digit);
  }, [locked, pin.length]);

  const handleSubmit = useCallback(() => {
    if (pin.length < 4) {
      setShake(true); setTimeout(() => setShake(false), 300); return;
    }
    onUnlock(pin); setPin("");
  }, [pin, onUnlock]);

  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "C", "0", "Enter"];

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className={`bg-slate-900 border border-slate-700 rounded-3xl p-8 w-full max-w-md ${shake ? "animate-bounce" : ""}`}>
        <h2 className="text-2xl text-white text-center mb-2">Staff Access</h2>
        <p className="text-slate-400 text-center text-sm mb-6">Enter your 4-6 digit PIN</p>
        <div className="flex justify-center gap-3 mb-8">
          {[0,1,2,3,4,5].map((i) => (
            <div key={i} className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-2xl font-bold transition-all ${i < pin.length ? "border-emerald-500 bg-emerald-500/20 text-emerald-400" : "border-slate-600 bg-slate-800 text-slate-600"}`}>{i < pin.length ? "●" : ""}</div>
          ))}
        </div>
        {locked && <div className="text-red-400 text-center mb-4 animate-pulse">Locked. Try again in 30 seconds.</div>}
        {attempts > 0 && !locked && <div className="text-amber-400 text-center text-sm mb-4">Attempt {attempts} of {maxAttempts}</div>}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {digits.map((digit) => (
            <button key={digit} onClick={() => { if (digit === "C") setPin(""); else if (digit === "Enter") handleSubmit(); else handleDigit(digit); }} disabled={locked} className={`h-16 rounded-xl text-xl font-semibold transition-all ${digit === "Enter" ? "bg-emerald-600 hover:bg-emerald-500 text-white" : digit === "C" ? "bg-red-600/80 hover:bg-red-500 text-white" : "bg-slate-800 hover:bg-slate-700 text-white"} disabled:opacity-50`}>{digit}</button>
          ))}
        </div>
        <button onClick={onCancel} className="w-full py-3 text-slate-400 hover:text-white transition-colors">Cancel</button>
      </div>
    </div>
  );
}
