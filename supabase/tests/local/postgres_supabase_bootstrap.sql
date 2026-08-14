-- Minimal Supabase-managed surface for the portable PostgreSQL 15 fallback.
-- This file is test infrastructure only; it is never a product migration.
-- It lets migrations 001-041 execute in a real PostgreSQL server when the
-- Supabase Docker stack is unavailable. Supabase-local remains the preferred
-- and final parity environment.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin NOLOGIN SUPERUSER;
  END IF;
END;
$$;

ALTER ROLE anon NOLOGIN NOBYPASSRLS;
ALTER ROLE authenticated NOLOGIN NOBYPASSRLS;
ALTER ROLE service_role NOLOGIN BYPASSRLS;
ALTER ROLE supabase_admin NOLOGIN SUPERUSER;

CREATE SCHEMA auth;
CREATE SCHEMA extensions;
CREATE SCHEMA cron;

-- Supabase grants API roles privileges on new public objects and lets RLS
-- decide row access. Migration 040 then deliberately revokes anon SELECT from
-- its sensitive source tables; order matters for parity.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT EXECUTE ON FUNCTIONS TO anon, authenticated, service_role;

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA public;

CREATE TABLE auth.users (
  instance_id UUID,
  id UUID PRIMARY KEY,
  aud TEXT,
  role TEXT,
  email TEXT,
  encrypted_password TEXT,
  email_confirmed_at TIMESTAMPTZ,
  raw_app_meta_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  raw_user_meta_data JSONB NOT NULL DEFAULT '{}'::JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmation_token TEXT NOT NULL DEFAULT '',
  email_change TEXT NOT NULL DEFAULT '',
  email_change_token_new TEXT NOT NULL DEFAULT '',
  recovery_token TEXT NOT NULL DEFAULT ''
);

CREATE OR REPLACE FUNCTION auth.jwt()
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(
    NULLIF(pg_catalog.current_setting('request.jwt.claims', true), ''),
    '{}'
  )::JSONB;
$$;

CREATE OR REPLACE FUNCTION auth.uid()
RETURNS UUID
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT NULLIF(auth.jwt() ->> 'sub', '')::UUID;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT COALESCE(NULLIF(auth.jwt() ->> 'role', ''), current_user::TEXT);
$$;

GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.jwt() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.role() TO anon, authenticated, service_role;
