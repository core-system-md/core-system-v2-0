-- Master Test #110 runtime reconciliation.
-- Evidence: isolated replay exposed canonical Production invoice fields and the
-- active Doctor screen queried dominant_disc_profile from clinic_patients,
-- while the canonical source is patient_longitudinal_profiles.
-- Scope: additive replay compatibility + source alignment; no auth/RLS contract change.

ALTER TABLE public.clinic_invoices
  ADD COLUMN IF NOT EXISTS invoice_status varchar(30),
  ADD COLUMN IF NOT EXISTS subtotal_subunits integer,
  ADD COLUMN IF NOT EXISTS tax_subunits integer,
  ADD COLUMN IF NOT EXISTS discount_subunits integer,
  ADD COLUMN IF NOT EXISTS total_subunits integer,
  ADD COLUMN IF NOT EXISTS amount_paid_subunits integer,
  ADD COLUMN IF NOT EXISTS amount_due_subunits integer,
  ADD COLUMN IF NOT EXISTS collected_reception boolean DEFAULT false;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_invoices' AND column_name = 'status'
  ) THEN
    EXECUTE 'UPDATE public.clinic_invoices
             SET invoice_status = COALESCE(invoice_status, status)
             WHERE invoice_status IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_invoices' AND column_name = 'subtotal_fils'
  ) THEN
    EXECUTE 'UPDATE public.clinic_invoices
             SET subtotal_subunits = COALESCE(subtotal_subunits, subtotal_fils)
             WHERE subtotal_subunits IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_invoices' AND column_name = 'tax_fils'
  ) THEN
    EXECUTE 'UPDATE public.clinic_invoices
             SET tax_subunits = COALESCE(tax_subunits, tax_fils)
             WHERE tax_subunits IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_invoices' AND column_name = 'discount_fils'
  ) THEN
    EXECUTE 'UPDATE public.clinic_invoices
             SET discount_subunits = COALESCE(discount_subunits, discount_fils)
             WHERE discount_subunits IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_invoices' AND column_name = 'total_fils'
  ) THEN
    EXECUTE 'UPDATE public.clinic_invoices
             SET total_subunits = COALESCE(total_subunits, total_fils)
             WHERE total_subunits IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_invoices' AND column_name = 'paid_fils'
  ) THEN
    EXECUTE 'UPDATE public.clinic_invoices
             SET amount_paid_subunits = COALESCE(amount_paid_subunits, paid_fils)
             WHERE amount_paid_subunits IS NULL';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'clinic_invoices' AND column_name = 'balance_fils'
  ) THEN
    EXECUTE 'UPDATE public.clinic_invoices
             SET amount_due_subunits = COALESCE(amount_due_subunits, balance_fils)
             WHERE amount_due_subunits IS NULL';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_clinic_invoices_tenant_invoice_status
  ON public.clinic_invoices (tenant_id, invoice_status, invoice_date)
  WHERE deleted_at IS NULL;
