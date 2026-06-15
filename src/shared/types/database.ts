// src/shared/types/database.ts
// Database type aliases for CORE SYSTEM™ v2.1
// Generated: June 2026
// Matches migrations 001–018

export type UUID = string;
export type Timestampz = string; // ISO 8601 with timezone

export type SubscriptionTier = 'trial' | 'essential' | 'professional' | 'enterprise' | 'suspended';
export type UserRole = 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist';
export type SessionStatus = 'pending' | 'checked_in' | 'in_progress' | 'completed' | 'cancelled' | 'no_show' | 'abandoned' | 'rescheduled';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'waived' | 'refunded' | 'disputed';
export type InvoiceStatus = 'draft' | 'issued' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type BreachType = 'sla_wait_time' | 'ghost_evaluation' | 'prestige_inflation' | 'triangulation_mismatch' | 'auto_session_close' | 'delivery_failure' | 'offline_duration' | 'Operational_Negligence_Lock_Abandonment';
export type BreachSeverity = 'info' | 'warning' | 'critical';
export type BreachStatus = 'open' | 'investigating' | 'resolved' | 'closed' | 'ignored';
export type NotificationChannel = 'email' | 'sms' | 'push' | 'in_app' | 'whatsapp';
export type NotificationStatus = 'pending' | 'processing' | 'sent' | 'delivered' | 'failed' | 'cancelled' | 'expired';
export type AgendaResourceType = 'room' | 'doctor' | 'equipment';
export type AgendaEventType = 'appointment' | 'block' | 'break' | 'maintenance' | 'meeting';
export type AgendaStatus = 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
export type InquiryType = 'walk_in' | 'appointment' | 'callback' | 'online';
export type InquiryStatus = 'pending' | 'converted_to_session' | 'cancelled' | 'rescheduled' | 'no_show';
export type FollowupType = 'post_visit_24h' | 'post_visit_7d' | 'reactivation_30d' | 'reactivation_60d' | 'reactivation_90d' | 'appointment_reminder_24h' | 'appointment_reminder_2h' | 'birthday' | 'custom';
export type FollowupStatus = 'pending' | 'contacted' | 'scheduled' | 'completed' | 'failed' | 'cancelled' | 'no_response';
export type FollowupOutcome = 'booked' | 'declined' | 'deferred' | 'no_longer_interested' | 'unreachable' | 'other';
export type PatientGender = 'male' | 'female' | 'other' | 'prefer_not_to_say';
export type PatientStatus = 'active' | 'inactive' | 'vip' | 'blocked' | 'transferred';
export type LoyaltyTier = 'standard' | 'silver' | 'gold' | 'vip';
export type DiscProfile = 'driver' | 'influencer' | 'analytical' | 'emotional';
export type ParResult = 'full_acceptance' | 'partial_acceptance' | 'deferred' | 'rejection' | 'no_decision';
export type PatientClass = 'low_priority' | 'medium_priority' | 'high_priority' | 'qualified' | 'hot_lead';
export type ScoringMode = 'first_time' | 'weighted_ltv';
export type BillingEventType = 'subscription' | 'usage' | 'overage' | 'refund' | 'credit' | 'adjustment' | 'trial_start' | 'trial_end' | 'upgrade' | 'downgrade' | 'cancellation' | 'renewal';
export type BillingStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | 'refunded' | 'disputed';
export type InventoryTransactionType = 'purchase' | 'use' | 'adjustment' | 'return' | 'waste' | 'transfer';
export type AuditAction = 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'view' | 'other';
export type AuditActorType = 'user' | 'system' | 'api' | 'integration' | 'scheduled_task';
export type DeviceType = 'desktop' | 'mobile' | 'tablet' | 'kiosk' | 'other';
export type RoomType = 'consultation' | 'procedure' | 'waiting' | 'reception';
export type FeatureFlagKey = 'telehealth_integration' | 'advanced_analytics' | 'mobile_app_notifications' | 'patient_self_service' | 'inventory_management' | 'ai_scheduling_assistant';
export type RuleCategory = 'scoring' | 'sla' | 'automation' | 'billing' | 'permissions';
export type HealthScorePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type MedicalSpecialty = 'dermatology' | 'non_surgical_cosmetic' | 'dental' | 'general_practice' | 'internal_medicine' | 'general_surgery' | 'gynecology_obstetrics' | 'physiotherapy';
export type CurrencyCode = 'USD' | 'EUR' | 'GBP' | 'JOD' | 'SAR' | 'EGP' | 'AED' | 'KWD' | 'QAR' | 'BHD' | 'OMR' | 'TND' | 'LBP' | 'IQD' | 'MAD' | 'YER' | 'SYP' | 'SDG';

// New table types (migrations 016–017)
export interface CurrencyReference {
  code: CurrencyCode;
  name: string;
  name_ar: string | null;
  subunit: number;
  symbol: string | null;
  decimal_places: number;
  is_active: boolean;
  is_crypto: boolean;
  countries: string[] | null;
  metadata: Record<string, unknown>;
  updated_at: Timestampz;
}

export interface MedicalProcedureTaxonomy {
  id: UUID;
  medical_specialty: MedicalSpecialty;
  category: string | null;
  procedure_name: string;
  procedure_name_ar: string | null;
  standard_code: string | null;
  standard_code_type: string | null;
  standard_duration_minutes: number;
  description: string | null;
  is_active: boolean;
  is_regional_standard: boolean;
  metadata: Record<string, unknown>;
  created_at: Timestampz;
  updated_at: Timestampz;
}

// Updated clinic_procedures (migration 017)
export interface ClinicProcedure {
  id: UUID;
  tenant_id: UUID;
  name: string;
  code: string;
  description: string | null;
  base_price_subunits: number; // was _fils
  duration_minutes: number;
  is_active: boolean;
  category: string | null;
  created_at: Timestampz;
  updated_at: Timestampz;
  // New fields from 017
  taxonomy_id: UUID | null;
  is_custom: boolean;
}

// Updated clinic_patients (migration 015)
export interface ClinicPatient {
  id: UUID;
  tenant_id: UUID;
  mrn: string;
  full_name: string; // Active display field
  first_name: string | null;
  father_name: string | null;
  last_name: string | null;
  first_name_ar: string | null;
  father_name_ar: string | null;
  last_name_ar: string | null;
  phone: string | null;
  email: string | null;
  date_of_birth: string | null; // ISO date
  gender: PatientGender | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  medical_history_notes: string | null;
  allergies: string | null;
  is_active: boolean;
  created_at: Timestampz;
  updated_at: Timestampz;
}
