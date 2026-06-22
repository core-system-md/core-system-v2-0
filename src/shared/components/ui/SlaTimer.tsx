// ============================================================
// CORE SYSTEM v2.1 — SlaTimer
// Constitution §5 (SLA): Green <15min, Yellow 15-24min, Red >=25min
// ============================================================

import { useEffect, useState } from 'react';

interface SlaTimerProps {
  created_at: string;
}

export function SlaTimer({ created_at }: SlaTimerProps) {
  const [elapsed, setElapsed] = useState('');

  useEffect(() => {
    const start = new Date(created_at).getTime();
    
    const update = () => {
      const now = Date.now();
      const diffMinutes = Math.floor((now - start) / 60000);
      
      let label = 'آمن';
      
      if (diffMinutes >= 25) {
        label = 'تجاوز';
      } else if (diffMinutes >= 15) {
        label = 'تحذير';
      }
      
      setElapsed(`${diffMinutes}د ${label}`);
    };

    update();
    const interval = setInterval(update, 60000);
    return () => clearInterval(interval);
  }, [created_at]);

  return (
    <span className={`inline-flex items-center px-2 py-1 rounded text-sm font-medium ${
      elapsed.includes('تجاوز') ? 'bg-red-100 text-red-800' :
      elapsed.includes('تحذير') ? 'bg-yellow-100 text-yellow-800' :
      'bg-green-100 text-green-800'
    }`}>
      ⏱️ {elapsed}
    </span>
  );
}
