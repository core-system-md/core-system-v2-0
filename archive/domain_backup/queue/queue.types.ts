// ============================================================
// src/domain/queue/queue.types.ts
// CORE SYSTEM v2.1 — Queue Domain Types
// Blueprint Compliant: Section 9 (Sessions) + Section 8 (Agenda)
// TEMP: Using 'any' for missing Supabase types until types:gen
// ============================================================

// ─────────────────────────────────────────────────────────────
// TEMP: Fallback types until database.types.ts is regenerated
// ─────────────────────────────────────────────────────────────
type AnyTable = Record<string, any>;

export type VisitSessionRow = AnyTable & {
  id: string;
  tenant_id: string;
  patient_id: string;
  doctor_id: string;
  room_id: string | null;
  agenda_event_id: string | null;
  arrived_at: string | null;
  session_started_at: string | null;
  session_ended_at: string | null;
  visit_closed_at: string | null;
  waiting_time_minutes: number | null;
  session_duration_minutes: number | null;
  score_aps: number | null;
  score_dri: number | null;
  score_tsi: number | null;
  score_uri: number | null;
  score_pqs: number | null;
  score_rvs: number | null;
  core_score_backend: number | null;
  core_score_display: number | null;
  patient_class: 'low_priority' | 'medium_priority' | 'high_priority' | 'qualified' | 'hot_lead' | null;
  scoring_mode: 'first_time' | 'weighted_ltv' | null;
  par_result: string | null;
  doctor_notes: string | null;
  session_status: 'waiting' | 'in_consultation' | 'pending_close' | 'auto_closed' | 'completed' | 'cancelled';
  lock_holder_id: string | null;
  lock_timestamp: string | null;
  initialized_by_receptionist: string | null;
  is_insured: boolean;
  prestige_inflation_detected: boolean;
  prestige_inflation_factor: number;
  triangulation_verified: boolean;
  buffer_window_expires_at: string | null;
  auto_close_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AgendaEventRow = AnyTable & {
  id: string;
  tenant_id: string;
  patient_id: string | null;
  doctor_id: string | null;
  room_id: string | null;
  procedure_id: string | null;
  scheduled_start: string;
  scheduled_end: string;
  buffer_end: string;
  event_type: string;
  visit_type: 'first_time' | 'follow_up' | 'emergency' | 'consultation' | null;
  status: string;
  created_at: string;
};

export type ClinicUserRow = AnyTable & {
  id: string;
  tenant_id: string;
  full_name: string;
  full_name_ar: string | null;
  role: 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';
  specialization: string | null;
  employee_code: string;
  pin_code: string;
  pin_hash: string | null;
  phone: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type ClinicPatientRow = AnyTable & {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  first_name_ar: string | null;
  last_name_ar: string | null;
  date_of_birth: string | null;
  gender: 'male' | 'female' | null;
  phone_primary: string;
  phone_secondary: string | null;
  email: string | null;
  preferred_channel: 'whatsapp' | 'sms' | 'email';
  patient_status: 'active' | 'inactive' | 'vip' | 'blocked' | 'transferred';
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

// ─────────────────────────────────────────────────────────────
// Queue Card — The atomic unit displayed on LiveQueueBoard
// ─────────────────────────────────────────────────────────────
export interface QueueCard {
  sessionId: string;
  patientId: string;
  patientName: string;
  patientPhone: string;
  doctorId: string;
  doctorName: string;
  roomId: string | null;
  roomName: string | null;
  
  sessionStatus: VisitSessionRow['session_status'];
  arrivedAt: string | null;
  sessionStartedAt: string | null;
  waitingTimeMinutes: number | null;
  
  coreScoreDisplay: number | null;
  patientClass: 'low_priority' | 'medium_priority' | 'high_priority' | 'qualified' | 'hot_lead';
  
  lockHolderId: string | null;
  lockHolderName: string | null;
  lockTimestamp: string | null;
  isLocked: boolean;
  
  isInsured: boolean;
  
  agendaEventId: string | null;
  scheduledStart: string | null;
  visitType: 'first_time' | 'follow_up' | 'emergency' | 'consultation' | null;
  
  sortOrder: number;
  createdAt: string;
}

// ─────────────────────────────────────────────────────────────
// Queue State — Full board state for a tenant
// ─────────────────────────────────────────────────────────────
export interface QueueState {
  tenantId: string;
  cards: QueueCard[];
  activeDoctors: ActiveDoctorSlot[];
  lastUpdated: string;
}

export interface ActiveDoctorSlot {
  doctorId: string;
  doctorName: string;
  specialization: string | null;
  roomId: string | null;
  roomName: string | null;
  currentSessionId: string | null;
  nextAvailableAt: string | null;
  isOnline: boolean;
}

// ─────────────────────────────────────────────────────────────
// Lock Operations (Blueprint Section 9: lock governance)
// ─────────────────────────────────────────────────────────────
export interface LockAcquirePayload {
  sessionId: string;
  staffId: string;
}

export interface LockReleasePayload {
  sessionId: string;
  staffId: string;
  force?: boolean;
}

export interface LockTransferPayload {
  sessionId: string;
  fromStaffId: string;
  toStaffId: string;
}

export type LockResult = 
  | { success: true; lockTimestamp: string }
  | { success: false; error: 'ALREADY_LOCKED' | 'SESSION_CLOSED' | 'RATE_LIMITED' | 'UNAUTHORIZED'; lockedBy?: string };

// ─────────────────────────────────────────────────────────────
// Queue Mutations (Blueprint: drag-drop reorder, hot-swap)
// ─────────────────────────────────────────────────────────────
export interface ReorderPayload {
  sessionId: string;
  newIndex: number;
  previousIndex: number;
}

export interface HotSwapPayload {
  sourceSessionId: string;
  targetSessionId: string;
  swapType: 'doctor' | 'room' | 'time';
}

// ─────────────────────────────────────────────────────────────
// SLA Radar Types (Blueprint Section 20 + Page 31)
// ─────────────────────────────────────────────────────────────
export type SlaStatus = 'green' | 'yellow' | 'red';

export interface SlaMetrics {
  sessionId: string;
  waitTimeMinutes: number;
  status: SlaStatus;
  thresholdMinutes: {
    green: number;
    yellow: number;
    red: number;
  };
}

// ─────────────────────────────────────────────────────────────
// Filter & Query Types
// ─────────────────────────────────────────────────────────────
export type QueueFilter = 'all' | 'waiting' | 'in_consultation' | 'pending_close' | 'hot_leads' | 'insured';

export interface QueueQueryParams {
  tenantId: string;
  filter?: QueueFilter;
  doctorId?: string;
  date?: string;
}