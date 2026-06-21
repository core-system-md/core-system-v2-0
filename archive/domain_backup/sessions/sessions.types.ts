// ============================================================
// src/domain/sessions/sessions.types.ts
// CORE SYSTEM v2.1 — Visit Sessions Domain Types
// Blueprint Compliant: Section 9 (clinic_visit_sessions)
// ============================================================

// Session Lifecycle State Machine
// Blueprint: waiting → in_consultation → pending_close → completed/cancelled
export type SessionStatus = 
  | "waiting" 
  | "in_consultation" 
  | "pending_close" 
  | "auto_closed" 
  | "completed" 
  | "cancelled";

export interface SessionLifecycle {
  sessionId: string;
  currentStatus: SessionStatus;
  canTransitionTo: SessionStatus[];
  requiredConditions: TransitionCondition[];
}

export interface TransitionCondition {
  type: "invoice_paid" | "doctor_par" | "lock_held" | "time_elapsed" | "none";
  fulfilled: boolean;
  description: string;
}

// Session Detail View (Doctor Dashboard)
export interface SessionDetail {
  session: any; // Will be typed when database.types.ts is regenerated
  patient: any;
  invoice: any | null;
  agendaEvent: {
    scheduled_start: string;
    scheduled_end: string;
    procedure_name: string;
  } | null;
  
  // Scores
  scores: {
    aps: number | null;
    dri: number | null;
    tsi: number | null;
    uri: number | null;
    pqs: number | null;
    rvs: number | null;
    coreBackend: number | null;
    coreDisplay: number | null;
  };
  
  // Doctor decision
  parResult: "full_acceptance" | "partial_acceptance" | "deferred" | "rejection" | "no_decision" | null;
  doctorNotes: string | null;
  
  // Timestamps
  timeline: {
    arrivedAt: string | null;
    sessionStartedAt: string | null;
    sessionEndedAt: string | null;
    visitClosedAt: string | null;
    bufferWindowExpiresAt: string | null;
    autoCloseAt: string | null;
  };
}

// Session Filter Types
export type SessionFilter = 
  | "today_all"
  | "today_waiting" 
  | "today_in_consultation"
  | "today_completed"
  | "my_sessions"
  | "hot_leads"
  | "no_show";

export interface SessionQueryParams {
  tenantId: string;
  filter: SessionFilter;
  doctorId?: string;
  date?: string; // YYYY-MM-DD
  patientId?: string;
}