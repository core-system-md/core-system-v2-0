-- P-ReceptionAgendaSchema: align the legacy scheduling table with the active reception RPC contract.
--
-- The active reception RPCs use doctor_id + scheduled_start/scheduled_end/buffer_end.
-- The original 005 migration uses resource_id + start_at/end_at instead.
-- Keep legacy fields for compatibility, but make them nullable so canonical inserts work.

ALTER TABLE public.master_agenda_events
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.clinic_rooms(id),
  ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES public.clinic_inquiries(id),
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buffer_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visit_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_sent_2h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.master_agenda_events
  ALTER COLUMN resource_type DROP NOT NULL,
  ALTER COLUMN resource_id DROP NOT NULL,
  ALTER COLUMN start_at DROP NOT NULL,
  ALTER COLUMN end_at DROP NOT NULL;

UPDATE public.master_agenda_events
SET
  doctor_id = CASE WHEN resource_type = 'doctor' THEN resource_id ELSE doctor_id END,
  scheduled_start = COALESCE(scheduled_start, start_at),
  scheduled_end = COALESCE(scheduled_end, end_at),
  buffer_end = COALESCE(buffer_end, end_at),
  created_by = COALESCE(created_by, user_id)
WHERE scheduled_start IS NULL
   OR scheduled_end IS NULL
   OR buffer_end IS NULL
   OR doctor_id IS NULL
   OR created_by IS NULL;

CREATE INDEX IF NOT EXISTS idx_master_agenda_events_tenant_date
  ON public.master_agenda_events(tenant_id, scheduled_start);

CREATE INDEX IF NOT EXISTS idx_master_agenda_events_doctor_date
  ON public.master_agenda_events(doctor_id, scheduled_start)
  WHERE deleted_at IS NULL
    AND status NOT IN ('cancelled', 'no_show');

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'no_doctor_overlap'
  ) THEN
    ALTER TABLE public.master_agenda_events
      ADD CONSTRAINT no_doctor_overlap
      EXCLUDE USING gist (
        doctor_id WITH =,
        tstzrange(scheduled_start, buffer_end) WITH &&
      )
      WHERE (status NOT IN ('cancelled', 'no_show'));
  END IF;
END $$;
