import { useEffect, useRef, useCallback, useState } from "react";

interface IdleWatcherProps {
  timeoutMs?: number;
  onIdle?: () => void;
  onActive?: () => void;
  children: React.ReactNode;
}

export function IdleWatcher({ timeoutMs = 60000, onIdle, onActive, children }: IdleWatcherProps) {
  const [isIdle, setIsIdle] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (isIdle) { setIsIdle(false); onActive?.(); }
    timerRef.current = setTimeout(() => { setIsIdle(true); onIdle?.(); }, timeoutMs);
  }, [timeoutMs, isIdle, onIdle, onActive]);

  useEffect(() => {
    const events = ["mousedown", "mousemove", "keydown", "touchstart", "scroll", "click"];
    const handleActivity = () => resetTimer();
    events.forEach((e) => window.addEventListener(e, handleActivity, { passive: true }));
    resetTimer();
    return () => { events.forEach((e) => window.removeEventListener(e, handleActivity)); if (timerRef.current) clearTimeout(timerRef.current); };
  }, [resetTimer]);

  return (
    <div className="relative">
      {children}
      {isIdle && (
        <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center z-40 animate-fade-in">
          <div className="text-center">
            <div className="w-24 h-24 rounded-full border-4 border-slate-700 border-t-emerald-500 animate-spin mx-auto mb-6" />
            <h2 className="text-3xl text-slate-300 font-light">Tap to wake</h2>
            <p className="text-slate-500 mt-2">System idle — touch screen to resume</p>
          </div>
        </div>
      )}
    </div>
  );
}
