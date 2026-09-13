-- Canonical scheduling compatibility.
-- The earliest agenda migration created resource_id/start_at/end_at, while the
-- active Blueprint/application contract uses doctor_id/room_id/scheduled_start/
-- scheduled_end/buffer_end plus booking metadata. Add the canonical columns
-- without removing the legacy columns, then backfill and keep both contracts
-- synchronized for the active application path.

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
  doctor_id = CASE WHEN doctor_id IS NULL AND resource_type = 'doctor' THEN resource_id ELSE doctor_id END,
  room_id = CASE WHEN room_id IS NULL AND resource_type = 'room' THEN resource_id ELSE room_id END,
  scheduled_start = COALESCE(scheduled_start, start_at),
  scheduled_end = COALESCE(scheduled_end, end_at),
  buffer_end = COALESCE(buffer_end, end_at),
  booking_notes = COALESCE(booking_notes, description),
  created_by = COALESCE(created_by, user_id);

CREATE OR REPLACE FUNCTION public.sync_master_agenda_legacy_columns()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $function$
BEGIN
  IF NEW.scheduled_start IS NULL THEN NEW.scheduled_start := NEW.start_at; END IF;
  IF NEW.scheduled_end IS NULL THEN NEW.scheduled_end := NEW.end_at; END IF;
  IF NEW.buffer_end IS NULL THEN NEW.buffer_end := COALESCE(NEW.scheduled_end, NEW.end_at); END IF;
  IF NEW.start_at IS NULL THEN NEW.start_at := NEW.scheduled_start; END IF;
  IF NEW.end_at IS NULL THEN NEW.end_at := NEW.scheduled_end; END IF;

  IF NEW.doctor_id IS NULL AND NEW.resource_type = 'doctor' THEN NEW.doctor_id := NEW.resource_id; END IF;
  IF NEW.room_id IS NULL AND NEW.resource_type = 'room' THEN NEW.room_id := NEW.resource_id; END IF;
  IF NEW.resource_type IS NULL THEN
    NEW.resource_type := CASE WHEN NEW.doctor_id IS NOT NULL THEN 'doctor' WHEN NEW.room_id IS NOT NULL THEN 'room' ELSE 'equipment' END;
  END IF;
  IF NEW.resource_id IS NULL THEN NEW.resource_id := COALESCE(NEW.doctor_id, NEW.room_id, NEW.user_id); END IF;

  IF NEW.user_id IS NULL THEN NEW.user_id := NEW.created_by; END IF;
  IF NEW.created_by IS NULL THEN NEW.created_by := NEW.user_id; END IF;
  IF NEW.description IS NULL THEN NEW.description := NEW.booking_notes; END IF;
  IF NEW.booking_notes IS NULL THEN NEW.booking_notes := NEW.description; END IF;

  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS trg_sync_master_agenda_legacy_columns ON public.master_agenda_events;
CREATE TRIGGER trg_sync_master_agenda_legacy_columns
BEFORE INSERT OR UPDATE ON public.master_agenda_events
FOR EACH ROW
EXECUTE FUNCTION public.sync_master_agenda_legacy_columns();

CREATE INDEX IF NOT EXISTS idx_agenda_tenant_date_canonical
  ON public.master_agenda_events(tenant_id, scheduled_start)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_agenda_doctor_date_canonical
  ON public.master_agenda_events(doctor_id, scheduled_start)
  WHERE deleted_at IS NULL AND status NOT IN ('cancelled','no_show');
