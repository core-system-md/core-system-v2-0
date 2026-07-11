/**
 * @file BufferWindowRule.ts
 * @description Buffer time rules between appointments to prevent scheduling conflicts
 * @constitution §5.2 - Minimum buffer windows between sessions based on procedure type
 */

export interface BufferConfig {
  procedureType: string;
  bufferMinutes: number;
  reason: string;
}

const BUFFER_MAP: Record<string, number> = {
  'consultation': 5,
  'examination': 10,
  'cleaning': 15,
  'filling': 20,
  'extraction': 30,
  'root_canal': 45,
  'crown': 30,
  'implant': 60,
  'surgery': 60,
  'orthodontic_adjustment': 15,
  'whitening': 20,
  'xray': 5,
  'default': 10,
};

export const BufferWindowRule = {
  getBuffer(procedureType: string): number {
    return BUFFER_MAP[procedureType] ?? BUFFER_MAP['default'] ?? 10;
  },

  hasSufficientBuffer(
    endTime: Date,
    nextStartTime: Date,
    procedureType: string
  ): boolean {
    const requiredBuffer = this.getBuffer(procedureType) * 60 * 1000;
    const actualGap = nextStartTime.getTime() - endTime.getTime();
    return actualGap >= requiredBuffer;
  },

  getEarliestNextSlot(endTime: Date, procedureType: string): Date {
    const bufferMs = this.getBuffer(procedureType) * 60 * 1000;
    return new Date(endTime.getTime() + bufferMs);
  },

  getAllBuffers(): BufferConfig[] {
    return Object.entries(BUFFER_MAP).map(([procedureType, bufferMinutes]) => ({
      procedureType,
      bufferMinutes,
      reason: `Standard ${bufferMinutes}-minute buffer for ${procedureType}`,
    }));
  },

  validateScheduleChange(
    proposedStart: Date,
    proposedEnd: Date,
    adjacentSessions: Array<{ start: Date; end: Date; procedureType: string }>
  ): { valid: boolean; conflicts: string[] } {
    const conflicts: string[] = [];
    
    for (const session of adjacentSessions) {
      if (session.end > proposedStart) {
        const buffer = this.getBuffer(session.procedureType);
        const gap = (proposedStart.getTime() - session.end.getTime()) / 60000;
        if (gap < buffer) {
          conflicts.push(`Insufficient buffer before: need ${buffer}min, have ${Math.round(gap)}min`);
        }
      }
      
      if (session.start < proposedEnd) {
        const buffer = this.getBuffer(session.procedureType);
        const gap = (session.start.getTime() - proposedEnd.getTime()) / 60000;
        if (gap < buffer) {
          conflicts.push(`Insufficient buffer after: need ${buffer}min, have ${Math.round(gap)}min`);
        }
      }
    }
    
    return { valid: conflicts.length === 0, conflicts };
  },
};
