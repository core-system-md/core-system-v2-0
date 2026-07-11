/**
 * @file SamPatelProtocol.ts
 * @description Dr. Sam Patel's Emergency Escalation Protocol for SLA breaches
 * @constitution §6.3 - Named protocol for critical patient wait-time escalation
 */

export interface EscalationLevel {
  level: number;
  name: string;
  waitThresholdMinutes: number;
  notifyRoles: string[];
  action: string;
  autoAssign: boolean;
}

const ESCALATION_LEVELS: EscalationLevel[] = [
  {
    level: 1,
    name: 'Standard Alert',
    waitThresholdMinutes: 15,
    notifyRoles: ['receptionist'],
    action: 'Display amber warning on queue board',
    autoAssign: false,
  },
  {
    level: 2,
    name: 'Supervisor Notice',
    waitThresholdMinutes: 30,
    notifyRoles: ['receptionist', 'clinic_admin'],
    action: 'Send notification to clinic admin dashboard',
    autoAssign: false,
  },
  {
    level: 3,
    name: 'Manager Alert',
    waitThresholdMinutes: 45,
    notifyRoles: ['clinic_admin', 'doctor_on_duty'],
    action: 'Push alert to doctor mobile + admin console',
    autoAssign: false,
  },
  {
    level: 4,
    name: 'Sam Patel Protocol',
    waitThresholdMinutes: 60,
    notifyRoles: ['clinic_admin', 'doctor_on_duty', 'super_admin'],
    action: 'EMERGENCY: Auto-assign to next available senior doctor + SMS to clinic manager',
    autoAssign: true,
  },
];

export interface PatientWaitStatus {
  patientId: string;
  sessionId: string;
  checkedInAt: Date;
  currentWaitMinutes: number;
  escalationLevel: number;
  assignedDoctorId?: string;
}

export const SamPatelProtocol = {
  getEscalationLevel(waitMinutes: number): EscalationLevel {
    for (let i = ESCALATION_LEVELS.length - 1; i >= 0; i--) {
      const level = ESCALATION_LEVELS[i];
      if (level && waitMinutes >= level.waitThresholdMinutes) {
        return level;
      }
    }
    return ESCALATION_LEVELS[0]!;
  },

  checkBreaches(patients: PatientWaitStatus[]): PatientWaitStatus[] {
    const firstLevel = ESCALATION_LEVELS[0];
    if (!firstLevel) return [];
    return patients.filter(p => p.currentWaitMinutes >= firstLevel.waitThresholdMinutes);
  },

  getAllLevels(): EscalationLevel[] {
    return [...ESCALATION_LEVELS];
  },

  formatAlert(patient: PatientWaitStatus, level: EscalationLevel): string {
    return `[${level.name}] Patient ${patient.patientId} has been waiting ${patient.currentWaitMinutes} minutes. Action: ${level.action}`;
  },

  shouldAutoAssign(waitMinutes: number): boolean {
    const level = this.getEscalationLevel(waitMinutes);
    return level.autoAssign;
  },

  getSlaTarget(priority: 'urgent' | 'high' | 'normal' | 'low'): number {
    const targets = {
      urgent: 5,
      high: 15,
      normal: 30,
      low: 60,
    };
    return targets[priority] ?? targets.normal;
  },

  isWithinSla(waitMinutes: number, priority: 'urgent' | 'high' | 'normal' | 'low'): boolean {
    return waitMinutes <= this.getSlaTarget(priority);
  },
};
