-- P151 — Align replayed master agenda schema with the verified production contract.
-- Evidence: production exposes doctor_id, room_id, inquiry_id, scheduled_start/end,
-- buffer_end, visit_type, booking_notes, created_by and deleted_at. Legacy replay
-- schema used resource_id/resource_type/start_at/end_at and rejected dashboard RPC reads.
-- Add forward-compatible columns, backfill from legacy columns, and make legacy-only
-- NOT NULL columns optional so the modern booking RPC can write the production shape.

ALTER TABLE public.master_agenda_events
  ADD COLUMN IF NOT EXISTS doctor_id UUID REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS room_id UUID REFERENCES public.clinic_rooms(id),
  ADD COLUMN IF NOT EXISTS inquiry_id UUID REFERENCES public.clinic_inquiries(id),
  ADD COLUMN IF NOT EXISTS scheduled_start TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS scheduled_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS buffer_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS visit_type VARCHAR(30),
  ADD COLUMN IF NOT EXISTS cancellation_reason VARCHAR(100),
  ADD COLUMN IF NOT EXISTS reminder_sent_24h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS reminder_sent_2h BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS booking_notes TEXT,
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.clinic_users(id),
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

UPDATE public.master_agenda_events
SET scheduled_start = COALESCE(scheduled_start, start_at),
    scheduled_end = COALESCE(scheduled_end, end_at),
    buffer_end = COALESCE(buffer_end, scheduled_end, end_at),
    doctor_id = COALESCE(
      doctor_id,
      CASE WHEN resource_type = 'doctor' THEN resource_id ELSE NULL END
    ),
    room_id = COALESCE(
      room_id,
      CASE WHEN resource_type = 'room' THEN resource_id ELSE NULL END
    ),
    created_by = COALESCE(created_by, user_id),
    reminder_sent_24h = COALESCE(reminder_sent_24h, FALSE),
    reminder_sent_2h = COALESCE(reminder_sent_2h, FALSE)
WHERE scheduled_start IS NULL
   OR scheduled_end IS NULL
   OR buffer_end IS NULL
   OR reminder_sent_24h IS NULL
   OR reminder_sent_2h IS NULL
   OR (doctor_id IS NULL AND resource_type = 'doctor')
   OR (room_id IS NULL AND resource_type = 'room')
   OR (created_by IS NULL AND user_id IS NOT NULL);

ALTER TABLE public.master_agenda_events
  ALTER COLUMN scheduled_start SET NOT NULL,
  ALTER COLUMN scheduled_end SET NOT NULL,
  ALTER COLUMN buffer_end SET NOT NULL;

DO $agenda_legacy_compat$
DECLARE
  v_column TEXT;
BEGIN
  FOREACH v_column IN ARRAY ARRAY['resource_type', 'resource_id', 'start_at', 'end_at'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'master_agenda_events'
        AND column_name = v_column
    ) THEN
      EXECUTE format('ALTER TABLE public.master_agenda_events ALTER COLUMN %I DROP NOT NULL', v_column);
    END IF;
  END LOOP;
END;
$agenda_legacy_compat$;

CREATE INDEX IF NOT EXISTS idx_master_agenda_events_doctor_schedule
  ON public.master_agenda_events (tenant_id, doctor_id, scheduled_start)
  WHERE deleted_at IS NULL;
