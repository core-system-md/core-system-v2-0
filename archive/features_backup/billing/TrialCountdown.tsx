import { useState, useEffect } from "react";

interface TrialCountdownProps {
  trialEndDate: string;
  onExtend?: () => void;
  onUpgrade?: () => void;
}

export function TrialCountdown({ trialEndDate, onExtend, onUpgrade }: TrialCountdownProps) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    const end = new Date(trialEndDate).getTime();
    const update = () => {
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { setExpired(true); return; }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [trialEndDate]);

  if (expired) {
    return (
      <div className="bg-red-950/30 border border-red-600/30 rounded-2xl p-6 text-center">
        <h3 className="text-xl font-bold text-red-400 mb-2">Trial Expired</h3>
        <p className="text-sm text-slate-400 mb-4">Your trial period has ended. Upgrade to continue using CORE.</p>
        <div className="flex gap-3 justify-center">
          {onExtend && <button onClick={onExtend} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">Extend 7 Days</button>}
          {onUpgrade && <button onClick={onUpgrade} className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors">Upgrade Now</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-amber-950/20 border border-amber-600/20 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-amber-400 mb-4">Trial Period</h3>
      <div className="grid grid-cols-4 gap-3 mb-4">
        {[
          { value: timeLeft.days, label: "Days" },
          { value: timeLeft.hours, label: "Hours" },
          { value: timeLeft.minutes, label: "Mins" },
          { value: timeLeft.seconds, label: "Secs" },
        ].map((item) => (
          <div key={item.label} className="bg-slate-900/50 rounded-xl p-3 text-center border border-slate-800">
            <div className="text-2xl font-bold text-white">{String(item.value).padStart(2, "0")}</div>
            <div className="text-xs text-slate-500 mt-1">{item.label}</div>
          </div>
        ))}
      </div>
      <div className="flex gap-3">
        {onExtend && <button onClick={onExtend} className="flex-1 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm hover:bg-slate-700 transition-colors">Extend</button>}
        {onUpgrade && <button onClick={onUpgrade} className="flex-1 py-2 rounded-xl bg-emerald-600 text-white text-sm hover:bg-emerald-500 transition-colors">Upgrade</button>}
      </div>
    </div>
  );
}
