-- P100: Restrict direct client execution of financial SECURITY DEFINER RPCs.
-- Active application search found no caller for either RPC; service_role remains the
-- supported privileged execution path. Function bodies/signatures are unchanged.

REVOKE EXECUTE ON FUNCTION public.create_invoice(
  UUID,
  UUID,
  INT,
  INT,
  INT,
  TEXT
) FROM authenticated;

REVOKE EXECUTE ON FUNCTION public.mark_invoice_paid(
  UUID,
  INT,
  UUID
) FROM authenticated;
