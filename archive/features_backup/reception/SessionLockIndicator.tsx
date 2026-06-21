import { useEffect, useState } from "react";

interface SessionLockIndicatorProps {
  lockedBy: string | null;
  lockedAt: string | null;
  expiresAt: string | null;
  onRequestUnlock?: () => void;
}

export function SessionLockIndicator({ lockedBy, expiresAt, onRequestUnlock }: SessionLockIndicatorProps) {
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const updateTimer = () => { setTimeLeft(Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))); };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiresAt]);

  if (!lockedBy) return null;

  const formatTime = (seconds: number) => { const mins = Math.floor(seconds / 60); const secs = seconds % 60; return `${mins}:${secs.toString().padStart(2, "0")}`; };

  return (
    <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex items-center gap-4">
      <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center flex-shrink-0">
        <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium text-amber-300">Session locked by {lockedBy}</p>
        <p className="text-xs text-amber-400/70 mt-0.5">{timeLeft !== null && timeLeft > 0 ? `Auto-unlock in ${formatTime(timeLeft)}` : "Lock expired — stale"}</p>
      </div>
      <button onClick={onRequestUnlock} className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-400 text-xs font-medium hover:bg-amber-500/30 transition-colors border border-amber-500/30">Request Unlock</button>
    </div>
  );
}
