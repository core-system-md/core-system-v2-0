// ============================================
// CoreScoreMeter.tsx
// Sacred: Displays Core Score with color coding per Constitution §4.2 + §5
// Backend scale: 0-1000 | Display scale: 0.0-100.0
// ============================================
import React from 'react';

interface CoreScoreMeterProps {
  score: number; // Display scale: 0.0 to 100.0
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

const scoreConfig = {
  hot_lead: { min: 90.0, color: '#22c55e', label: 'VIP' },       // Green
  qualified: { min: 80.0, color: '#3b82f6', label: 'مؤهل' },      // Blue
  high_priority: { min: 60.0, color: '#eab308', label: 'أولوية' }, // Yellow
  medium_priority: { min: 40.0, color: '#f97316', label: 'متوسط' }, // Orange
  low_priority: { min: 0.0, color: '#ef4444', label: 'عادي' },     // Red
};

function getScoreClass(score: number): keyof typeof scoreConfig {
  if (score >= 90.0) return 'hot_lead';
  if (score >= 80.0) return 'qualified';
  if (score >= 60.0) return 'high_priority';
  if (score >= 40.0) return 'medium_priority';
  return 'low_priority';
}

export const CoreScoreMeter: React.FC<CoreScoreMeterProps> = ({
  score,
  size = 'md',
  showLabel = true,
}) => {
  const config = scoreConfig[getScoreClass(score)];
  
  const sizeClasses = {
    sm: 'w-12 h-12 text-sm',
    md: 'w-20 h-20 text-lg',
    lg: 'w-28 h-28 text-2xl',
  };

  const circumference = 2 * Math.PI * 40;
  const progress = (score / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-2" dir="rtl">
      <div className={`relative ${sizeClasses[size]} flex items-center justify-center`}>
        <svg className="transform -rotate-90 w-full h-full" viewBox="0 0 100 100">
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke="#e5e7eb"
            strokeWidth="8"
          />
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="none"
            stroke={config.color}
            strokeWidth="8"
            strokeDasharray={`${progress} ${circumference}`}
            strokeLinecap="round"
            className="transition-all duration-500"
          />
        </svg>
        <span className="absolute font-bold" style={{ color: config.color }}>
          {score.toFixed(1)}
        </span>
      </div>
      {showLabel && (
        <span className="text-sm font-medium" style={{ color: config.color }}>
          {config.label}
        </span>
      )}
    </div>
  );
};
