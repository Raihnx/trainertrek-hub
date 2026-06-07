
-- Client type (General Training vs Personal Training)
DO $$ BEGIN
  CREATE TYPE public.client_type AS ENUM ('GT', 'PT');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS client_type public.client_type NOT NULL DEFAULT 'PT';

CREATE INDEX IF NOT EXISTS idx_clients_type ON public.clients(client_type);

-- Audit log enrichment
ALTER TABLE public.admin_audit_log
  ADD COLUMN IF NOT EXISTS actor_role text,
  ADD COLUMN IF NOT EXISTS actor_name text,
  ADD COLUMN IF NOT EXISTS description text;

-- Allow any authenticated user to insert their own audit entries (already exists), and
-- allow non-admin staff to read their own actions (admins still see all via existing policy).
DO $$ BEGIN
  CREATE POLICY "users read own audit entries"
    ON public.admin_audit_log
    FOR SELECT
    USING (auth.uid() = actor_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
