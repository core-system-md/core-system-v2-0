-- PostgreSQL Extensions
-- Required for UUID generation, HTTP requests, and temporal exclusions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "btree_gist";

-- The initial RLS migration defines internal helpers in Supabase's managed auth schema.
-- Restore the required schema privileges on every fresh local/CI database replay.
GRANT USAGE, CREATE ON SCHEMA auth TO postgres;