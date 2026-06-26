import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface SlaTimerProps {
  createdAt: string;
  size?: 'sm' | 'md';
}

export default function SlaTimer({ createdAt, size = 'md' }: SlaTimerProps) {
  const [minutes, setMinutes] = useState(0);

  useEffect(() => {
    const calculateMinutes = () => {
      const created = new Date(createdAt).getTime();
      const now = Date.now();
      const diff = Math.max(0, Math.floor((now - created) / 60000));
      setMinutes(diff);
    };
    calculateMinutes();
    const interval = setInterval(calculateMinutes, 60000);
    return () => clearInterval(interval);
  }, [createdAt]);

  let colorClass = 'text-green-400';
  let bgClass = 'bg-green-500/20';
  let label = 'آمن';
  if (minutes >= 25) { colorClass = 'text-red-400'; bgClass = 'bg-red-500/20'; label = 'تجاوز'; }
  else if (minutes >= 15) { colorClass = 'text-yellow-400'; bgClass = 'bg-yellow-500/20'; label = 'تحذير'; }

  const sizeClasses = {
    sm: { icon: 'w-3 h-3', text: 'text-xs', padding: 'px-2 py-0.5' },
    md: { icon: 'w-4 h-4', text: 'text-sm', padding: 'px-3 py-1' }
  };
  const sizes = sizeClasses[size];

  return (
    <div className={`inline-flex items-center gap-1.5 rounded-lg ${bgClass} ${sizes.padding}`}>
      <Clock className={`${sizes.icon} ${colorClass}`} />
      <span className={`font-mono font-medium ${colorClass} ${sizes.text}`}>{minutes}د</span>
      <span className={`${colorClass} ${sizes.text} opacity-70`}>{label}</span>
    </div>
  );
}
