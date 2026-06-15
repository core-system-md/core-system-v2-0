import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface CoreScoreWidgetProps {
  score: number;
  label: string;
  trend?: "up" | "down" | "neutral";
  size?: "sm" | "md" | "lg";
}

export default function CoreScoreWidget({
  score,
  label,
  trend = "neutral",
  size = "md",
}: CoreScoreWidgetProps) {
  const [animatedScore, setAnimatedScore] = useState(0);

  // Clamp score between 0-100
  const clampedScore = Math.max(0, Math.min(100, score));

  // Animate score on mount
  useEffect(() => {
    const duration = 1000;
    const steps = 60;
    const increment = clampedScore / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= clampedScore) {
        setAnimatedScore(clampedScore);
        clearInterval(timer);
      } else {
        setAnimatedScore(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [clampedScore]);

  // Size configurations
  const sizeConfig = {
    sm: { container: "w-24 h-24", text: "text-2xl", label: "text-xs", stroke: 6 },
    md: { container: "w-36 h-36 md:w-44 md:h-44", text: "text-4xl md:text-5xl", label: "text-sm md:text-base", stroke: 8 },
    lg: { container: "w-48 h-48 md:w-56 md:h-56", text: "text-5xl md:text-6xl", label: "text-base md:text-lg", stroke: 10 },
  };

  const config = sizeConfig[size];

  // Calculate SVG circle properties
  const radius = 50 - config.stroke / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (animatedScore / 100) * circumference;

  // Color based on score
  const getScoreColor = () => {
    if (clampedScore >= 80) return "#10B981"; // emerald-500
    if (clampedScore >= 60) return "#F59E0B"; // amber-500
    if (clampedScore >= 40) return "#F97316"; // orange-500
    return "#EF4444"; // red-500
  };

  const scoreColor = getScoreColor();

  // Trend icon
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor = trend === "up" ? "text-emerald-400" : trend === "down" ? "text-red-400" : "text-slate-400";
  const trendLabel = trend === "up" ? "Improving" : trend === "down" ? "Declining" : "Stable";

  return (
    <div className="bg-white/5 border border-white/10 backdrop-blur-sm rounded-xl p-4 md:p-6 flex flex-col items-center gap-3 md:gap-4 hover:bg-white/10 transition-all duration-300">
      {/* Progress Ring */}
      <div className={`${config.container} relative`}>
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={config.stroke}
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={scoreColor}
            strokeWidth={config.stroke}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={`${config.text} font-bold text-white tabular-nums`}>
            {animatedScore}
          </span>
          <span className="text-xs md:text-sm text-white/50">/ 100</span>
        </div>
      </div>

      {/* Label */}
      <div className="text-center">
        <p className={`${config.label} font-semibold text-white/90`}>{label}</p>
        <div className={`flex items-center justify-center gap-1 mt-1 ${trendColor}`}>
          <TrendIcon className="w-4 h-4" />
          <span className="text-xs md:text-sm font-medium">{trendLabel}</span>
        </div>
      </div>
    </div>
  );
}