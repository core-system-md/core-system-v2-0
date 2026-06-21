// src/shared/hooks/useSlaTimer.ts
// Interval-based SLA countdown with color states

import { useState, useEffect } from 'react';
import { computeSlaStatus, getSlaColorToken, getSlaLabel } from '../../core/rules/sla/SlaThresholds';
import type { SlaStatus } from '../../core/rules/sla/SlaThresholds';

export function useSlaTimer(checkInAt: string | null) {
  const [waitMinutes, setWaitMinutes] = useState(0);
  const [status, setStatus] = useState<SlaStatus>('green');

  useEffect(() => {
    if (!checkInAt) return;

    const update = () => {
      const checkIn = new Date(checkInAt);
      const now = new Date();
      const minutes = Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60));
      setWaitMinutes(minutes);
      setStatus(computeSlaStatus(minutes));
    };

    update(); // Initial
    const interval = setInterval(update, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [checkInAt]);

  return {
    waitMinutes,
    status,
    colorToken: getSlaColorToken(status),
    label: getSlaLabel(status),
    isBreach: status === 'red',
  };
}
