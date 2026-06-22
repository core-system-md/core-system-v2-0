// ============================================
// SlaTimer.tsx
// Sacred: Displays SLA wait time with color coding per Constitution §5
// Green: <15min | Yellow: 15-24min | Red: >=25min (Breach)
// ============================================
import React, { useEffect, useState } from 'react';

interface SlaTimerProps {
  scheduledStart: string; // ISO timestamp
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const SLA_THRESHOLDS = {
  GREEN: 15,  // < 15 min
  YELLOW: 24, // 15-24 min
  RED: 25,    // >= 25 min (Breach)
};

function getSlaConfig(minutes: number) {
  if (minutes < SLA_THRESHOLDS.GREEN) {
    return { color: '#22c55e', label: 'آمن', bg: 'bg-green-50', border: 'border-green-200' };
  }
  if (minutes <= SLA_THRESHOLDS.YELLOW) {
    return { color: '#eab308', label: 'تحذير', bg: 'bg-yellow-50', border: 'border-yellow-200' };
  }
  return { color: '#ef4444', label: 'تجاوز', bg: 'bg-red-50', border: 'border-red-200' };
}

function formatDuration(minutes: number): string {
  const hrs = Math.floor(minutes / 60);
  const mins = Math.floor(minutes % 60);
  if (hrs > 0) {
    return `${hrs}س ${mins}د`;
  }
  return `${mins}د`;
}

export const SlaTimer: React.FC<SlaTimerProps> = ({
  scheduledStart,
  size = 'md',
  showLabel = true,
}) => {
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  useEffect(() => {
    const startTime = new Date(scheduledStart).getTime();
    
    const updateTimer = () => {
      const now = Date.now();
      const diffMs = now - startTime;
      const diffMins = Math.max(0, Math.floor(diffMs / 60000));
      setElapsedMinutes(diffMins);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [scheduledStart]);

  const config = getSlaConfig(elapsedMinutes);

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs gap-1',
    md: 'px-3 py-1.5 text-sm gap-2',
    lg: 'px-4 py-2 text-base gap-2',
  };

  return (
    <div 
      className={`inline-flex items-center rounded-lg border ${config.border} ${config.bg} ${sizeClasses[size]}`}
      dir="rtl"
    >
      <div 
        className="w-2.5 h-2.5 rounded-full animate-pulse"
        style={{ backgroundColor: config.color }}
      />
      <span className="font-mono font-semibold" style={{ color: config.color }}>
        {formatDuration(elapsedMinutes)}
      </span>
      {showLabel && (
        <span className="text-xs opacity-75" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </div>
  );
};
