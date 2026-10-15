-- Runtime-only compatibility probe for an external bcrypt hash normalized to $2a$.
-- The rehearsal runner substitutes a random synthetic PIN and its runtime hash.
DO $normalized_hash_probe$
DECLARE
  v_pin TEXT := '__RUNTIME_SYNTHETIC_PIN__';
  v_hash TEXT := '__RUNTIME_BCRYPT_2A_HASH__';
BEGIN
  IF v_hash !~ '^\$2a\$[0-9]{2}\$[./A-Za-z0-9]{53}$' THEN
    RAISE EXCEPTION 'Normalized hash is not in the accepted $2a$ format.';
  END IF;

  IF extensions.crypt(v_pin, v_hash) IS DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'The normalized hash did not verify the correct synthetic PIN.';
  END IF;

  IF extensions.crypt('synthetic incorrect normalization probe', v_hash) IS NOT DISTINCT FROM v_hash THEN
    RAISE EXCEPTION 'The normalized hash incorrectly accepted the wrong synthetic PIN.';
  END IF;
END;
$normalized_hash_probe$;
