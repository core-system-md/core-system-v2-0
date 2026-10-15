-- Minimal hashed-PIN contract stubs for the disposable rehearsal database only.
CREATE OR REPLACE FUNCTION public.verify_pin_hash(p_tenant_id UUID, p_pin TEXT)
RETURNS SETOF public.clinic_users
LANGUAGE sql
STABLE
SET search_path = ''
AS $verify$
  SELECT u.*
  FROM public.clinic_users u
  WHERE u.tenant_id = p_tenant_id
    AND u.pin_hash = extensions.crypt(p_pin, u.pin_hash)
    AND u.is_active = TRUE
    AND u.deleted_at IS NULL
$verify$;

CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id UUID, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $pin_only$
  SELECT EXISTS (
    SELECT 1 FROM public.verify_pin_hash(p_tenant_id, p_pin)
  )
$pin_only$;

CREATE OR REPLACE FUNCTION public.create_pin_session(p_tenant_id UUID, p_employee_code TEXT, p_pin TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = ''
AS $employee_pin$
  SELECT EXISTS (
    SELECT 1
    FROM public.verify_pin_hash(p_tenant_id, p_pin) u
    WHERE u.employee_code = p_employee_code
  )
$employee_pin$;

CREATE OR REPLACE FUNCTION public.validate_license(p_license_key TEXT)
RETURNS SETOF public.master_tenants
LANGUAGE sql
STABLE
SET search_path = ''
AS $license$
  SELECT t.*
  FROM public.master_tenants t
  WHERE t.license_key = p_license_key
    AND t.is_active = TRUE
    AND t.deleted_at IS NULL
$license$;
