-- Canonical scheduling compatibility.
-- The earliest agenda migration created resource_id/start_at/end_at, while the
-- active Blueprint/application contract uses doctor_id/room_id/scheduled_start/
-- scheduled_end/buffer_end plus booking metadata. Add the canonical columns
-- without removing the legacy columns, then backfill existing rows.

ALTER TABLE public.master_agenda_events
  ADD COLUMN IF NOT EXISTS patient_id uuid,
  ADD COLUMN IF NOT EXISTS doctor_id uuid,
  ADD COLUMN IF NOT EXISTS room_id uuid,
  ADD COLUMN IF NOT EXISTS procedure_id uuid,
  ADD COLUMN IF NOT EXISTS inquiry_id uuid,
  ADD COLUMN IF NOT EXISTS scheduled_start timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_end timestamptz,
  ADD COLUMN IF NOT EXISTS buffer_end timestamptz,
  ADD COLUMN IF NOT EXISTS visit_type varchar(20),
  ADD COLUMN IF NOT EXISTS booking_notes text,
  ADD COLUMN IF NOT EXISTS cancellation_reason varchar(100),
  ADD COLUMN IF NOT EXISTS created_by uuid,
  ADD COLUMN IF NOT EXISTS reminder_sent_24h boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS reminder_sent_2h boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

UPDATE public.master_agenda_events
SET
  doctor_id = CASE
    WHEN doctor_id IS NULL AND resource_type = 'doctor' THEN resource_id
    ELSE doctor_id
  END,
  room_id = CASE
    WHEN room_id IS NULL AND resource_type = 'room' THEN resource_id
    ELSE room_id
  END,
  scheduled_start = COALESCE(scheduled_start, start_at),
  scheduled_end = COALESCE(scheduled_end, end_at),
  buffer_end = COALESCE(buffer_end, end_at),
  booking_notes = COALESCE(booking_notes, description),
  created_by = COALESCE(created_by, user_id);

ALTER TABLE public.master_agenda_events
  ALTER COLUMN scheduled_start SET DEFAULT NOW(),
  ALTER COLUMN scheduled_end SET DEFAULT NOW(),
  ALTER COLUMN buffer_end SET DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_agenda_tenant_date_canonical
  ON public.master_agenda_events(tenant_id, scheduled_start)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_doctor_date_canonical
  ON public.master_agenda_events(doctor_id, scheduled_start)
  WHERE deleted_at IS NULL AND status NOT IN ('cancelled','no_show');
