export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      analytics_daily_snapshots: {
        Row: {
          avg_core_score: number | null
          avg_session_duration_minutes: number | null
          avg_wait_time_minutes: number | null
          conversion_rate: number | null
          created_at: string
          hot_leads_count: number | null
          id: string
          sla_breaches_count: number | null
          snapshot_date: string
          snapshot_metadata: Json | null
          tenant_id: string
          total_cancellations: number | null
          total_discounts_subunits: number | null
          total_new_patients: number | null
          total_no_shows: number | null
          total_returning_patients: number | null
          total_revenue_subunits: number | null
          total_visits: number | null
          updated_at: string
        }
        Insert: {
          avg_core_score?: number | null
          avg_session_duration_minutes?: number | null
          avg_wait_time_minutes?: number | null
          conversion_rate?: number | null
          created_at?: string
          hot_leads_count?: number | null
          id?: string
          sla_breaches_count?: number | null
          snapshot_date: string
          snapshot_metadata?: Json | null
          tenant_id: string
          total_cancellations?: number | null
          total_discounts_subunits?: number | null
          total_new_patients?: number | null
          total_no_shows?: number | null
          total_returning_patients?: number | null
          total_revenue_subunits?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Update: {
          avg_core_score?: number | null
          avg_session_duration_minutes?: number | null
          avg_wait_time_minutes?: number | null
          conversion_rate?: number | null
          created_at?: string
          hot_leads_count?: number | null
          id?: string
          sla_breaches_count?: number | null
          snapshot_date?: string
          snapshot_metadata?: Json | null
          tenant_id?: string
          total_cancellations?: number | null
          total_discounts_subunits?: number | null
          total_new_patients?: number | null
          total_no_shows?: number | null
          total_returning_patients?: number | null
          total_revenue_subunits?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_snapshots_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          entity_id: string | null
          entity_type: string | null
          event_category: string
          event_name: string
          id: string
          ip_hash: string | null
          occurred_at: string
          properties: Json | null
          session_id: string | null
          tenant_id: string | null
          user_agent_hash: string | null
          user_id: string | null
        }
        Insert: {
          entity_id?: string | null
          entity_type?: string | null
          event_category: string
          event_name: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          properties?: Json | null
          session_id?: string | null
          tenant_id?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Update: {
          entity_id?: string | null
          entity_type?: string | null
          event_category?: string
          event_name?: string
          id?: string
          ip_hash?: string | null
          occurred_at?: string
          properties?: Json | null
          session_id?: string | null
          tenant_id?: string | null
          user_agent_hash?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinic_visit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_patient_metrics: {
        Row: {
          avg_disc_distribution: Json | null
          avg_ltv_subunits: number | null
          churned_patients: number | null
          created_at: string
          id: string
          metric_period: string
          new_patients: number | null
          period_end: string
          period_start: string
          reactivated_patients: number | null
          tenant_id: string
          top_procedures: Json | null
        }
        Insert: {
          avg_disc_distribution?: Json | null
          avg_ltv_subunits?: number | null
          churned_patients?: number | null
          created_at?: string
          id?: string
          metric_period: string
          new_patients?: number | null
          period_end: string
          period_start: string
          reactivated_patients?: number | null
          tenant_id: string
          top_procedures?: Json | null
        }
        Update: {
          avg_disc_distribution?: Json | null
          avg_ltv_subunits?: number | null
          churned_patients?: number | null
          created_at?: string
          id?: string
          metric_period?: string
          new_patients?: number | null
          period_end?: string
          period_start?: string
          reactivated_patients?: number | null
          tenant_id?: string
          top_procedures?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_patient_metrics_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_trail: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          record_id: string | null
          session_token: string | null
          table_name: string
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id?: string | null
          session_token?: string | null
          table_name: string
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          record_id?: string | null
          session_token?: string | null
          table_name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_trail_actor_id_fkey"
            columns: ["actor_id"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_trail_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      billing_events: {
        Row: {
          activated_by: string | null
          activation_notes: string | null
          amount_subunits: number | null
          created_at: string
          event_metadata: Json | null
          event_type: string
          id: string
          is_manual: boolean | null
          new_tier: string | null
          previous_tier: string | null
          stripe_event_id: string | null
          tenant_id: string | null
        }
        Insert: {
          activated_by?: string | null
          activation_notes?: string | null
          amount_subunits?: number | null
          created_at?: string
          event_metadata?: Json | null
          event_type: string
          id?: string
          is_manual?: boolean | null
          new_tier?: string | null
          previous_tier?: string | null
          stripe_event_id?: string | null
          tenant_id?: string | null
        }
        Update: {
          activated_by?: string | null
          activation_notes?: string | null
          amount_subunits?: number | null
          created_at?: string
          event_metadata?: Json | null
          event_type?: string
          id?: string
          is_manual?: boolean | null
          new_tier?: string | null
          previous_tier?: string | null
          stripe_event_id?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "billing_events_activated_by_fkey"
            columns: ["activated_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "billing_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_inquiries: {
        Row: {
          created_at: string
          expected_objection: string | null
          handled_by: string | null
          id: string
          initial_disc_guess: string | null
          inquiry_reason: string | null
          inquiry_type: string
          notes: string | null
          patient_id: string | null
          procedures_requested: string[] | null
          status: string | null
          temp_patient_name: string | null
          temp_phone: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          expected_objection?: string | null
          handled_by?: string | null
          id?: string
          initial_disc_guess?: string | null
          inquiry_reason?: string | null
          inquiry_type: string
          notes?: string | null
          patient_id?: string | null
          procedures_requested?: string[] | null
          status?: string | null
          temp_patient_name?: string | null
          temp_phone?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          expected_objection?: string | null
          handled_by?: string | null
          id?: string
          initial_disc_guess?: string | null
          inquiry_reason?: string | null
          inquiry_type?: string
          notes?: string | null
          patient_id?: string | null
          procedures_requested?: string[] | null
          status?: string | null
          temp_patient_name?: string | null
          temp_phone?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_inquiries_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_inquiries_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_inquiries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_invoices: {
        Row: {
          amount_due_subunits: number | null
          amount_paid_subunits: number
          collected_by: string | null
          collected_reception: boolean | null
          created_at: string
          discount_approved_by: string | null
          discount_reason: string | null
          discount_subunits: number
          doctor_par_confirmed: boolean | null
          id: string
          invoice_date: string
          invoice_status: string | null
          match_triangulation: boolean | null
          patient_id: string
          payment_method: string | null
          session_id: string
          subtotal_subunits: number
          tax_subunits: number
          tenant_id: string
          total_subunits: number
          updated_at: string
        }
        Insert: {
          amount_due_subunits?: number | null
          amount_paid_subunits?: number
          collected_by?: string | null
          collected_reception?: boolean | null
          created_at?: string
          discount_approved_by?: string | null
          discount_reason?: string | null
          discount_subunits?: number
          doctor_par_confirmed?: boolean | null
          id?: string
          invoice_date?: string
          invoice_status?: string | null
          match_triangulation?: boolean | null
          patient_id: string
          payment_method?: string | null
          session_id: string
          subtotal_subunits?: number
          tax_subunits?: number
          tenant_id: string
          total_subunits?: number
          updated_at?: string
        }
        Update: {
          amount_due_subunits?: number | null
          amount_paid_subunits?: number
          collected_by?: string | null
          collected_reception?: boolean | null
          created_at?: string
          discount_approved_by?: string | null
          discount_reason?: string | null
          discount_subunits?: number
          doctor_par_confirmed?: boolean | null
          id?: string
          invoice_date?: string
          invoice_status?: string | null
          match_triangulation?: boolean | null
          patient_id?: string
          payment_method?: string | null
          session_id?: string
          subtotal_subunits?: number
          tax_subunits?: number
          tenant_id?: string
          total_subunits?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_invoices_collected_by_fkey"
            columns: ["collected_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_discount_approved_by_fkey"
            columns: ["discount_approved_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinic_visit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_patients: {
        Row: {
          address: string | null
          allergies: string | null
          created_at: string
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          father_name: string | null
          father_name_ar: string | null
          first_name: string | null
          first_name_ar: string | null
          first_visit_date: string | null
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          last_name: string | null
          last_name_ar: string | null
          medical_history_notes: string | null
          mrn: string
          notes: string | null
          patient_status: string | null
          phone_primary: string | null
          phone_secondary: string | null
          preferred_channel: string | null
          referral_source: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          allergies?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          father_name?: string | null
          father_name_ar?: string | null
          first_name?: string | null
          first_name_ar?: string | null
          first_visit_date?: string | null
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_name_ar?: string | null
          medical_history_notes?: string | null
          mrn: string
          notes?: string | null
          patient_status?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          preferred_channel?: string | null
          referral_source?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          allergies?: string | null
          created_at?: string
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          father_name?: string | null
          father_name_ar?: string | null
          first_name?: string | null
          first_name_ar?: string | null
          first_visit_date?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          last_name?: string | null
          last_name_ar?: string | null
          medical_history_notes?: string | null
          mrn?: string
          notes?: string | null
          patient_status?: string | null
          phone_primary?: string | null
          phone_secondary?: string | null
          preferred_channel?: string | null
          referral_source?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_patients_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_procedures: {
        Row: {
          base_price_subunits: number
          buffer_time_minutes: number
          category: string | null
          created_at: string
          id: string
          is_active: boolean
          procedure_name: string
          procedure_name_ar: string | null
          standard_duration_minutes: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          base_price_subunits?: number
          buffer_time_minutes?: number
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          procedure_name: string
          procedure_name_ar?: string | null
          standard_duration_minutes?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          base_price_subunits?: number
          buffer_time_minutes?: number
          category?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          procedure_name?: string
          procedure_name_ar?: string | null
          standard_duration_minutes?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_procedures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_rooms: {
        Row: {
          capacity: number | null
          created_at: string
          floor_number: number | null
          id: string
          is_active: boolean
          room_name: string
          room_type: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          floor_number?: number | null
          id?: string
          is_active?: boolean
          room_name: string
          room_type: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          floor_number?: number | null
          id?: string
          is_active?: boolean
          room_name?: string
          room_type?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_rooms_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_users: {
        Row: {
          created_at: string
          deleted_at: string | null
          email: string
          employee_code: string | null
          full_name: string
          full_name_ar: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          password: string | null
          phone: string | null
          pin_code: string | null
          pin_hash: string | null
          role: string
          specialization: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          email: string
          employee_code?: string | null
          full_name: string
          full_name_ar?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password?: string | null
          phone?: string | null
          pin_code?: string | null
          pin_hash?: string | null
          role?: string
          specialization?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          email?: string
          employee_code?: string | null
          full_name?: string
          full_name_ar?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          password?: string | null
          phone?: string | null
          pin_code?: string | null
          pin_hash?: string | null
          role?: string
          specialization?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clinic_users_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_visit_sessions: {
        Row: {
          abandoned_at: string | null
          abandonment_reason: string | null
          actual_check_in: string | null
          actual_check_out: string | null
          actual_end: string | null
          actual_start: string | null
          additional_charges_subunits: number | null
          agenda_event_id: string | null
          arrived_at: string | null
          assigned_room_id: string | null
          auto_close_at: string | null
          base_charge_subunits: number | null
          buffer_window_expires_at: string | null
          check_in_method: string | null
          check_out_method: string | null
          completed_at: string | null
          core_score_backend: number | null
          core_score_display: number | null
          created_at: string
          diagnosis: string | null
          discount_subunits: number | null
          doctor_id: string | null
          doctor_notes: string | null
          follow_up_date: string | null
          follow_up_required: boolean | null
          id: string
          initialized_by_receptionist: string | null
          is_abandoned: boolean | null
          is_insured: boolean
          lock_holder_id: string | null
          lock_timestamp: string | null
          par_result: string | null
          patient_class: string | null
          patient_feedback: string | null
          patient_id: string
          patient_satisfaction_score: number | null
          payment_status: string
          prestige_inflation_detected: boolean | null
          prestige_inflation_factor: number | null
          primary_doctor_id: string | null
          procedure_id: string | null
          room_id: string | null
          scheduled_end: string | null
          scheduled_start: string | null
          score_aps: number | null
          score_dri: number | null
          score_pqs: number | null
          score_rvs: number | null
          score_tsi: number | null
          score_uri: number | null
          scoring_mode: string | null
          service_time_minutes: number | null
          session_duration_minutes: number | null
          session_ended_at: string | null
          session_metadata: Json | null
          session_started_at: string | null
          session_status: string
          tenant_id: string
          total_charge_subunits: number | null
          total_time_minutes: number | null
          treatment_performed: string | null
          triangulation_verified: boolean | null
          updated_at: string
          visit_closed_at: string | null
          wait_time_minutes: number | null
          waiting_time_minutes: number | null
        }
        Insert: {
          abandoned_at?: string | null
          abandonment_reason?: string | null
          actual_check_in?: string | null
          actual_check_out?: string | null
          actual_end?: string | null
          actual_start?: string | null
          additional_charges_subunits?: number | null
          agenda_event_id?: string | null
          arrived_at?: string | null
          assigned_room_id?: string | null
          auto_close_at?: string | null
          base_charge_subunits?: number | null
          buffer_window_expires_at?: string | null
          check_in_method?: string | null
          check_out_method?: string | null
          completed_at?: string | null
          core_score_backend?: number | null
          core_score_display?: number | null
          created_at?: string
          diagnosis?: string | null
          discount_subunits?: number | null
          doctor_id?: string | null
          doctor_notes?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          initialized_by_receptionist?: string | null
          is_abandoned?: boolean | null
          is_insured?: boolean
          lock_holder_id?: string | null
          lock_timestamp?: string | null
          par_result?: string | null
          patient_class?: string | null
          patient_feedback?: string | null
          patient_id: string
          patient_satisfaction_score?: number | null
          payment_status?: string
          prestige_inflation_detected?: boolean | null
          prestige_inflation_factor?: number | null
          primary_doctor_id?: string | null
          procedure_id?: string | null
          room_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          score_aps?: number | null
          score_dri?: number | null
          score_pqs?: number | null
          score_rvs?: number | null
          score_tsi?: number | null
          score_uri?: number | null
          scoring_mode?: string | null
          service_time_minutes?: number | null
          session_duration_minutes?: number | null
          session_ended_at?: string | null
          session_metadata?: Json | null
          session_started_at?: string | null
          session_status?: string
          tenant_id: string
          total_charge_subunits?: number | null
          total_time_minutes?: number | null
          treatment_performed?: string | null
          triangulation_verified?: boolean | null
          updated_at?: string
          visit_closed_at?: string | null
          wait_time_minutes?: number | null
          waiting_time_minutes?: number | null
        }
        Update: {
          abandoned_at?: string | null
          abandonment_reason?: string | null
          actual_check_in?: string | null
          actual_check_out?: string | null
          actual_end?: string | null
          actual_start?: string | null
          additional_charges_subunits?: number | null
          agenda_event_id?: string | null
          arrived_at?: string | null
          assigned_room_id?: string | null
          auto_close_at?: string | null
          base_charge_subunits?: number | null
          buffer_window_expires_at?: string | null
          check_in_method?: string | null
          check_out_method?: string | null
          completed_at?: string | null
          core_score_backend?: number | null
          core_score_display?: number | null
          created_at?: string
          diagnosis?: string | null
          discount_subunits?: number | null
          doctor_id?: string | null
          doctor_notes?: string | null
          follow_up_date?: string | null
          follow_up_required?: boolean | null
          id?: string
          initialized_by_receptionist?: string | null
          is_abandoned?: boolean | null
          is_insured?: boolean
          lock_holder_id?: string | null
          lock_timestamp?: string | null
          par_result?: string | null
          patient_class?: string | null
          patient_feedback?: string | null
          patient_id?: string
          patient_satisfaction_score?: number | null
          payment_status?: string
          prestige_inflation_detected?: boolean | null
          prestige_inflation_factor?: number | null
          primary_doctor_id?: string | null
          procedure_id?: string | null
          room_id?: string | null
          scheduled_end?: string | null
          scheduled_start?: string | null
          score_aps?: number | null
          score_dri?: number | null
          score_pqs?: number | null
          score_rvs?: number | null
          score_tsi?: number | null
          score_uri?: number | null
          scoring_mode?: string | null
          service_time_minutes?: number | null
          session_duration_minutes?: number | null
          session_ended_at?: string | null
          session_metadata?: Json | null
          session_started_at?: string | null
          session_status?: string
          tenant_id?: string
          total_charge_subunits?: number | null
          total_time_minutes?: number | null
          treatment_performed?: string | null
          triangulation_verified?: boolean | null
          updated_at?: string
          visit_closed_at?: string | null
          wait_time_minutes?: number | null
          waiting_time_minutes?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clinic_visit_sessions_initialized_by_receptionist_fkey"
            columns: ["initialized_by_receptionist"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_visit_sessions_lock_holder_id_fkey"
            columns: ["lock_holder_id"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_visit_sessions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_visit_sessions_primary_doctor_id_fkey"
            columns: ["primary_doctor_id"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinic_visit_sessions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      core_rules_config: {
        Row: {
          created_at: string
          id: string
          is_overridable: boolean | null
          rule_category: string
          rule_key: string
          rule_name: string
          rule_value: Json
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_overridable?: boolean | null
          rule_category: string
          rule_key: string
          rule_name: string
          rule_value?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_overridable?: boolean | null
          rule_category?: string
          rule_key?: string
          rule_name?: string
          rule_value?: Json
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "core_rules_config_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      currency_reference: {
        Row: {
          code: string
          countries: string[] | null
          decimal_places: number
          is_active: boolean
          is_crypto: boolean
          metadata: Json | null
          name: string
          name_ar: string | null
          subunit: number
          symbol: string | null
          updated_at: string
        }
        Insert: {
          code: string
          countries?: string[] | null
          decimal_places?: number
          is_active?: boolean
          is_crypto?: boolean
          metadata?: Json | null
          name: string
          name_ar?: string | null
          subunit?: number
          symbol?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          countries?: string[] | null
          decimal_places?: number
          is_active?: boolean
          is_crypto?: boolean
          metadata?: Json | null
          name?: string
          name_ar?: string | null
          subunit?: number
          symbol?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          allowed_tiers: string[] | null
          config_json: Json | null
          created_at: string
          description: string | null
          flag_key: string
          flag_name: string
          id: string
          is_enabled: boolean
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          allowed_tiers?: string[] | null
          config_json?: Json | null
          created_at?: string
          description?: string | null
          flag_key: string
          flag_name: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          allowed_tiers?: string[] | null
          config_json?: Json | null
          created_at?: string
          description?: string | null
          flag_key?: string
          flag_name?: string
          id?: string
          is_enabled?: boolean
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_ledger: {
        Row: {
          consumption_type: string
          created_at: string
          id: string
          logged_by: string | null
          material_name: string
          notes: string | null
          procedure_id: string | null
          quantity_consumed: number
          session_id: string | null
          tenant_id: string
        }
        Insert: {
          consumption_type: string
          created_at?: string
          id?: string
          logged_by?: string | null
          material_name: string
          notes?: string | null
          procedure_id?: string | null
          quantity_consumed: number
          session_id?: string | null
          tenant_id: string
        }
        Update: {
          consumption_type?: string
          created_at?: string
          id?: string
          logged_by?: string | null
          material_name?: string
          notes?: string | null
          procedure_id?: string | null
          quantity_consumed?: number
          session_id?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_ledger_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "clinic_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinic_visit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_ledger_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      master_agenda_events: {
        Row: {
          booking_notes: string | null
          buffer_end: string
          cancellation_reason: string | null
          created_at: string
          created_by: string | null
          doctor_id: string | null
          event_type: string
          id: string
          inquiry_id: string | null
          patient_id: string | null
          procedure_id: string | null
          reminder_sent_24h: boolean | null
          reminder_sent_2h: boolean | null
          room_id: string | null
          scheduled_end: string
          scheduled_start: string
          status: string | null
          tenant_id: string
          updated_at: string
          visit_type: string | null
        }
        Insert: {
          booking_notes?: string | null
          buffer_end: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          event_type: string
          id?: string
          inquiry_id?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          reminder_sent_24h?: boolean | null
          reminder_sent_2h?: boolean | null
          room_id?: string | null
          scheduled_end: string
          scheduled_start: string
          status?: string | null
          tenant_id: string
          updated_at?: string
          visit_type?: string | null
        }
        Update: {
          booking_notes?: string | null
          buffer_end?: string
          cancellation_reason?: string | null
          created_at?: string
          created_by?: string | null
          doctor_id?: string | null
          event_type?: string
          id?: string
          inquiry_id?: string | null
          patient_id?: string | null
          procedure_id?: string | null
          reminder_sent_24h?: boolean | null
          reminder_sent_2h?: boolean | null
          room_id?: string | null
          scheduled_end?: string
          scheduled_start?: string
          status?: string | null
          tenant_id?: string
          updated_at?: string
          visit_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "master_agenda_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_agenda_events_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_agenda_events_inquiry_id_fkey"
            columns: ["inquiry_id"]
            isOneToOne: false
            referencedRelation: "clinic_inquiries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_agenda_events_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_agenda_events_procedure_id_fkey"
            columns: ["procedure_id"]
            isOneToOne: false
            referencedRelation: "clinic_procedures"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_agenda_events_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "clinic_rooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "master_agenda_events_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      master_tenants: {
        Row: {
          address: string | null
          clinic_name_ar: string | null
          country_code: string | null
          created_at: string
          currency: string | null
          currency_subunit: number | null
          deleted_at: string | null
          id: string
          is_active: boolean
          license_key: string | null
          logo_url: string | null
          max_devices: number | null
          max_patients: number
          max_procedures_per_month: number
          max_users: number
          name: string
          primary_color: string | null
          primary_phone: string | null
          settings: Json
          slug: string
          subscription_end: string | null
          subscription_start: string | null
          subscription_tier: string
          timezone: string | null
          trial_started_at: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          clinic_name_ar?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          currency_subunit?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          license_key?: string | null
          logo_url?: string | null
          max_devices?: number | null
          max_patients?: number
          max_procedures_per_month?: number
          max_users?: number
          name: string
          primary_color?: string | null
          primary_phone?: string | null
          settings?: Json
          slug: string
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string
          timezone?: string | null
          trial_started_at?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          clinic_name_ar?: string | null
          country_code?: string | null
          created_at?: string
          currency?: string | null
          currency_subunit?: number | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          license_key?: string | null
          logo_url?: string | null
          max_devices?: number | null
          max_patients?: number
          max_procedures_per_month?: number
          max_users?: number
          name?: string
          primary_color?: string | null
          primary_phone?: string | null
          settings?: Json
          slug?: string
          subscription_end?: string | null
          subscription_start?: string | null
          subscription_tier?: string
          timezone?: string | null
          trial_started_at?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "fk_tenant_currency"
            columns: ["currency"]
            isOneToOne: false
            referencedRelation: "currency_reference"
            referencedColumns: ["code"]
          },
        ]
      }
      medical_procedure_taxonomy: {
        Row: {
          category: string | null
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_regional_standard: boolean
          medical_specialty: string
          metadata: Json | null
          procedure_name: string
          procedure_name_ar: string | null
          standard_code: string | null
          standard_code_type: string | null
          standard_duration_minutes: number | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_regional_standard?: boolean
          medical_specialty: string
          metadata?: Json | null
          procedure_name: string
          procedure_name_ar?: string | null
          standard_code?: string | null
          standard_code_type?: string | null
          standard_duration_minutes?: number | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_regional_standard?: boolean
          medical_specialty?: string
          metadata?: Json | null
          procedure_name?: string
          procedure_name_ar?: string | null
          standard_code?: string | null
          standard_code_type?: string | null
          standard_duration_minutes?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          channel: string
          created_at: string
          error_message: string | null
          id: string
          max_retries: number | null
          message_body: string
          metadata: Json | null
          priority: number | null
          recipient_email: string | null
          recipient_id: string | null
          recipient_phone: string | null
          recipient_type: string
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: string | null
          template_key: string | null
          tenant_id: string
        }
        Insert: {
          channel: string
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message_body: string
          metadata?: Json | null
          priority?: number | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          recipient_type: string
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_key?: string | null
          tenant_id: string
        }
        Update: {
          channel?: string
          created_at?: string
          error_message?: string | null
          id?: string
          max_retries?: number | null
          message_body?: string
          metadata?: Json | null
          priority?: number | null
          recipient_email?: string | null
          recipient_id?: string | null
          recipient_phone?: string | null
          recipient_type?: string
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string | null
          template_key?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_queue_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_intake_responses: {
        Row: {
          completed_at: string | null
          completion_status: string | null
          consent_accepted: boolean | null
          consent_timestamp: string | null
          consideration_period: string | null
          created_at: string
          decision_factor: string | null
          digital_signature_svg: string | null
          followup_importance: number | null
          id: string
          ip_address: unknown
          main_concern: string | null
          openness_to_proceed: number | null
          patient_id: string
          procedures_requested: string[] | null
          readiness_level: number | null
          referral_source: string | null
          service_interest: string | null
          service_reason: string | null
          session_id: string | null
          signature_timestamp: string | null
          tenant_id: string
          top_priorities: string[] | null
          updated_at: string
          user_agent: string | null
          visit_goal: string | null
          visit_type_selection: string | null
          whatsapp_redirect_sent: boolean | null
        }
        Insert: {
          completed_at?: string | null
          completion_status?: string | null
          consent_accepted?: boolean | null
          consent_timestamp?: string | null
          consideration_period?: string | null
          created_at?: string
          decision_factor?: string | null
          digital_signature_svg?: string | null
          followup_importance?: number | null
          id?: string
          ip_address?: unknown
          main_concern?: string | null
          openness_to_proceed?: number | null
          patient_id: string
          procedures_requested?: string[] | null
          readiness_level?: number | null
          referral_source?: string | null
          service_interest?: string | null
          service_reason?: string | null
          session_id?: string | null
          signature_timestamp?: string | null
          tenant_id: string
          top_priorities?: string[] | null
          updated_at?: string
          user_agent?: string | null
          visit_goal?: string | null
          visit_type_selection?: string | null
          whatsapp_redirect_sent?: boolean | null
        }
        Update: {
          completed_at?: string | null
          completion_status?: string | null
          consent_accepted?: boolean | null
          consent_timestamp?: string | null
          consideration_period?: string | null
          created_at?: string
          decision_factor?: string | null
          digital_signature_svg?: string | null
          followup_importance?: number | null
          id?: string
          ip_address?: unknown
          main_concern?: string | null
          openness_to_proceed?: number | null
          patient_id?: string
          procedures_requested?: string[] | null
          readiness_level?: number | null
          referral_source?: string | null
          service_interest?: string | null
          service_reason?: string | null
          session_id?: string | null
          signature_timestamp?: string | null
          tenant_id?: string
          top_priorities?: string[] | null
          updated_at?: string
          user_agent?: string | null
          visit_goal?: string | null
          visit_type_selection?: string | null
          whatsapp_redirect_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "patient_intake_responses_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_intake_responses_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinic_visit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_intake_responses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      patient_longitudinal_profiles: {
        Row: {
          created_at: string
          dominant_disc_profile: string | null
          historical_aps_avg: number | null
          historical_core_score_avg: number | null
          historical_dri_avg: number | null
          historical_pqs_avg: number | null
          historical_rvs_avg: number | null
          historical_tsi_avg: number | null
          historical_uri_avg: number | null
          id: string
          last_calculated_at: string | null
          last_visit_date: string | null
          loyalty_tier: string | null
          next_scheduled_visit: string | null
          patient_id: string
          profile_version: number | null
          tenant_id: string
          total_cancellations: number | null
          total_completed_visits: number | null
          total_no_shows: number | null
          total_revenue_subunits: number | null
          total_visits: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          dominant_disc_profile?: string | null
          historical_aps_avg?: number | null
          historical_core_score_avg?: number | null
          historical_dri_avg?: number | null
          historical_pqs_avg?: number | null
          historical_rvs_avg?: number | null
          historical_tsi_avg?: number | null
          historical_uri_avg?: number | null
          id?: string
          last_calculated_at?: string | null
          last_visit_date?: string | null
          loyalty_tier?: string | null
          next_scheduled_visit?: string | null
          patient_id: string
          profile_version?: number | null
          tenant_id: string
          total_cancellations?: number | null
          total_completed_visits?: number | null
          total_no_shows?: number | null
          total_revenue_subunits?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          dominant_disc_profile?: string | null
          historical_aps_avg?: number | null
          historical_core_score_avg?: number | null
          historical_dri_avg?: number | null
          historical_pqs_avg?: number | null
          historical_rvs_avg?: number | null
          historical_tsi_avg?: number | null
          historical_uri_avg?: number | null
          id?: string
          last_calculated_at?: string | null
          last_visit_date?: string | null
          loyalty_tier?: string | null
          next_scheduled_visit?: string | null
          patient_id?: string
          profile_version?: number | null
          tenant_id?: string
          total_cancellations?: number | null
          total_completed_visits?: number | null
          total_no_shows?: number | null
          total_revenue_subunits?: number | null
          total_visits?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "patient_longitudinal_profiles_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "patient_longitudinal_profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      pin_attempt_log: {
        Row: {
          attempted_pin: string
          created_at: string
          id: string
          ip_address: unknown
          success: boolean
          tenant_id: string
        }
        Insert: {
          attempted_pin: string
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          tenant_id: string
        }
        Update: {
          attempted_pin?: string
          created_at?: string
          id?: string
          ip_address?: unknown
          success?: boolean
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "pin_attempt_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      retention_followups: {
        Row: {
          channel: string | null
          created_at: string
          delivered_at: string | null
          delivery_status: string | null
          followup_type: string
          id: string
          message_body: string | null
          message_template_id: string | null
          patient_id: string
          response_received: boolean | null
          response_text: string | null
          scheduled_for: string
          sent_at: string | null
          sent_by: string | null
          session_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          channel?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          followup_type: string
          id?: string
          message_body?: string | null
          message_template_id?: string | null
          patient_id: string
          response_received?: boolean | null
          response_text?: string | null
          scheduled_for: string
          sent_at?: string | null
          sent_by?: string | null
          session_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          channel?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_status?: string | null
          followup_type?: string
          id?: string
          message_body?: string | null
          message_template_id?: string | null
          patient_id?: string
          response_received?: boolean | null
          response_text?: string | null
          scheduled_for?: string
          sent_at?: string | null
          sent_by?: string | null
          session_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "retention_followups_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_followups_sent_by_fkey"
            columns: ["sent_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_followups_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "clinic_visit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retention_followups_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_delivery_breaches: {
        Row: {
          breach_details: Json
          breach_type: string
          created_at: string
          id: string
          related_patient_id: string | null
          related_session_id: string | null
          related_user_id: string | null
          resolution_notes: string | null
          resolved: boolean | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string
          tenant_id: string
        }
        Insert: {
          breach_details?: Json
          breach_type: string
          created_at?: string
          id?: string
          related_patient_id?: string | null
          related_session_id?: string | null
          related_user_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity: string
          tenant_id: string
        }
        Update: {
          breach_details?: Json
          breach_type?: string
          created_at?: string
          id?: string
          related_patient_id?: string | null
          related_session_id?: string | null
          related_user_id?: string | null
          resolution_notes?: string | null
          resolved?: boolean | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_delivery_breaches_related_patient_id_fkey"
            columns: ["related_patient_id"]
            isOneToOne: false
            referencedRelation: "clinic_patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_delivery_breaches_related_session_id_fkey"
            columns: ["related_session_id"]
            isOneToOne: false
            referencedRelation: "clinic_visit_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_delivery_breaches_related_user_id_fkey"
            columns: ["related_user_id"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_delivery_breaches_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "clinic_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_delivery_breaches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_devices: {
        Row: {
          browser_info: string | null
          device_fingerprint: string
          device_name: string | null
          device_type: string | null
          id: string
          is_active: boolean | null
          last_seen_at: string | null
          os_info: string | null
          registered_at: string
          tenant_id: string
        }
        Insert: {
          browser_info?: string | null
          device_fingerprint: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          os_info?: string | null
          registered_at?: string
          tenant_id: string
        }
        Update: {
          browser_info?: string | null
          device_fingerprint?: string
          device_name?: string | null
          device_type?: string | null
          id?: string
          is_active?: boolean | null
          last_seen_at?: string | null
          os_info?: string | null
          registered_at?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_devices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_health_scores: {
        Row: {
          activity_score: number | null
          created_at: string
          feature_adoption_score: number | null
          id: string
          login_frequency_score: number | null
          overall_score: number
          patient_growth_score: number | null
          revenue_trend_score: number | null
          score_date: string
          score_details: Json | null
          tenant_id: string
        }
        Insert: {
          activity_score?: number | null
          created_at?: string
          feature_adoption_score?: number | null
          id?: string
          login_frequency_score?: number | null
          overall_score?: number
          patient_growth_score?: number | null
          revenue_trend_score?: number | null
          score_date?: string
          score_details?: Json | null
          tenant_id: string
        }
        Update: {
          activity_score?: number | null
          created_at?: string
          feature_adoption_score?: number | null
          id?: string
          login_frequency_score?: number | null
          overall_score?: number
          patient_growth_score?: number | null
          revenue_trend_score?: number | null
          score_date?: string
          score_details?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_health_scores_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "master_tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_pin_rate_limit: {
        Args: { p_ip_address?: unknown; p_tenant_id: string }
        Returns: boolean
      }
      compute_daily_snapshot: {
        Args: { p_date: string; p_tenant_id: string }
        Returns: Json
      }
      create_invoice: {
        Args: {
          p_discount_subunits?: number
          p_patient_id: string
          p_payment_method?: string
          p_session_id: string
          p_subtotal_subunits: number
          p_tax_subunits?: number
        }
        Returns: string
      }
      detect_leakage_gaps: { Args: never; Returns: number }
      generate_daily_snapshot: {
        Args: { p_snapshot_date?: string }
        Returns: number
      }
      get_agenda_for_doctor: {
        Args: { p_date: string; p_doctor_id: string }
        Returns: {
          id: string
          patient_name: string
          procedure_name: string
          room_name: string
          scheduled_end: string
          scheduled_start: string
          status: string
          visit_type: string
        }[]
      }
      get_current_tenant_id: { Args: never; Returns: string }
      get_current_user_role: { Args: never; Returns: string }
      get_patient_longitudinal: {
        Args: { p_patient_id: string }
        Returns: {
          avg_wait_time_minutes: number
          dominant_disc_profile: string
          historical_core_score_avg: number
          last_visit_date: string
          loyalty_tier: string
          total_cancellations: number
          total_completed_visits: number
          total_no_shows: number
          total_revenue_subunits: number
          total_visits: number
        }[]
      }
      get_queue_for_tenant: {
        Args: { p_tenant_id: string }
        Returns: {
          actual_check_in: string
          actual_start: string
          clinic_patients: Json
          clinic_procedures: Json
          clinic_users: Json
          core_score_display: number
          id: string
          is_insured: boolean
          lock_holder_id: string
          patient_id: string
          session_status: string
          wait_time_minutes: number
        }[]
      }
      get_queue_with_details: {
        Args: { p_tenant_id: string }
        Returns: {
          actual_check_in: string
          actual_start: string
          core_score_display: number
          doctor_id: string
          doctor_name: string
          id: string
          is_insured: boolean
          lock_holder_id: string
          lock_holder_name: string
          patient_id: string
          patient_name: string
          patient_phone: string
          procedure_name: string
          room_name: string
          session_status: string
          wait_time_minutes: number
        }[]
      }
      get_user_by_email: {
        Args: { p_email: string }
        Returns: {
          email: string
          full_name: string
          id: string
          role: string
          tenant_id: string
        }[]
      }
      hash_pin: { Args: { pin_code: string }; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
      mark_invoice_paid: {
        Args: {
          p_amount_paid_subunits: number
          p_collected_by: string
          p_invoice_id: string
        }
        Returns: boolean
      }
      process_pending_notifications: {
        Args: { batch_size?: number }
        Returns: number
      }
      release_abandoned_locks: {
        Args: { timeout_minutes?: number }
        Returns: number
      }
      update_session_status: {
        Args: {
          p_new_status: string
          p_session_id: string
          p_user_id: string
          p_user_role: string
        }
        Returns: boolean
      }
      validate_email_password: {
        Args: { p_email: string; p_password: string }
        Returns: {
          email: string
          full_name: string
          id: string
          role: string
          tenant_id: string
        }[]
      }
      validate_license: {
        Args: { p_license_key: string }
        Returns: {
          currency: string
          currency_subunit: number
          id: string
          is_active: boolean
          max_devices: number
          max_patients: number
          max_procedures_per_month: number
          max_users: number
          name: string
          settings: Json
          subscription_tier: string
          timezone: string
        }[]
      }
      validate_pin: {
        Args: { p_pin: string; p_tenant_id: string }
        Returns: {
          employee_code: string
          full_name: string
          id: string
          role: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
