interface SlaRadarBadgeProps {
  status: "green" | "yellow" | "red" | "breach";
  label?: string;
  minutes?: number;
  size?: "sm" | "md" | "lg";
}

export function SlaRadarBadge({ status, label, minutes, size = "md" }: SlaRadarBadgeProps) {
  const sizeClasses = { sm: "px-2 py-0.5 text-[10px]", md: "px-2.5 py-1 text-xs", lg: "px-3 py-1.5 text-sm" };
  const statusConfig = {
    green: { bg: "bg-emerald-500/15", border: "border-emerald-500/30", text: "text-emerald-400", dot: "bg-emerald-500", label: label || "On Track" },
    yellow: { bg: "bg-amber-500/15", border: "border-amber-500/30", text: "text-amber-400", dot: "bg-amber-500", label: label || "At Risk" },
    red: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-400", dot: "bg-red-500", label: label || "Critical" },
    breach: { bg: "bg-red-600/20", border: "border-red-600/50", text: "text-red-300", dot: "bg-red-600 animate-pulse", label: label || "BREACH" },
  };
  const c = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border ${c.bg} ${c.border} ${c.text} ${sizeClasses[size]} font-medium`}>
      <span className={`w-2 h-2 rounded-full ${c.dot}`} />
      {c.label}
      {minutes !== undefined && <span className="opacity-70">{minutes}m</span>}
    </span>
  );
}
