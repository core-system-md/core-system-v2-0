// src/shared/hooks/useSlaTimer.ts
// Interval-based SLA countdown with color states + SamPatelProtocol

import { useState, useEffect, useCallback } from 'react';
import { computeSlaStatus, getSlaColorToken, getSlaLabel } from '../../core/rules/sla/SlaThresholds';
import type { SlaStatus } from '../../core/rules/sla/SlaThresholds';
import { evaluateSamPatelProtocol, shouldTriggerProtocol } from '../../core/rules/sla/SamPatelProtocol';
import type { SamPatelAction } from '../../core/rules/sla/SamPatelProtocol';

export function useSlaTimer(checkInAt: string | null, patientClass?: string, isVip?: boolean) {
  const [waitMinutes, setWaitMinutes] = useState(0);
  const [status, setStatus] = useState<SlaStatus>('green');
  const [samPatelAction, setSamPatelAction] = useState<SamPatelAction | null>(null);
  const [protocolTriggered, setProtocolTriggered] = useState(false);

  const updateTimer = useCallback(() => {
    if (!checkInAt) return;

    const checkIn = new Date(checkInAt);
    const now = new Date();
    const minutes = Math.floor((now.getTime() - checkIn.getTime()) / (1000 * 60));
    setWaitMinutes(minutes);

    const newStatus = computeSlaStatus(minutes);
    setStatus(newStatus);

    if (shouldTriggerProtocol(minutes) && !protocolTriggered) {
      const action = evaluateSamPatelProtocol(minutes, patientClass || 'low_priority', isVip || false);
      if (action) {
        setSamPatelAction(action);
        setProtocolTriggered(true);
        console.warn('[SamPatelProtocol]', action.message);
      }
    }
  }, [checkInAt, patientClass, isVip, protocolTriggered]);

  useEffect(() => {
    if (!checkInAt) return;
    updateTimer();
    const interval = setInterval(updateTimer, 30000);
    return () => clearInterval(interval);
  }, [checkInAt, updateTimer]);

  return {
    waitMinutes,
    status,
    colorToken: getSlaColorToken(status),
    label: getSlaLabel(status),
    isBreach: status === 'red',
    samPatelAction,
    protocolTriggered,
  };
}
