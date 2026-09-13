-- CI compatibility: preserve the auth-schema privileges required by the
-- initial RLS helper migration after a fresh Supabase database reset.
-- This does not change auth schema ownership or production RLS behavior.
GRANT USAGE, CREATE ON SCHEMA auth TO postgres;
GRANT USAGE, CREATE ON SCHEMA auth TO supabase_admin;
