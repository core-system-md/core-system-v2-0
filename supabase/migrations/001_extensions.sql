-- PostgreSQL Extensions
-- Required for UUID generation, HTTP requests, and temporal exclusions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_net";
CREATE EXTENSION IF NOT EXISTS "btree_gist";
