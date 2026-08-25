CREATE TABLE IF NOT EXISTS public.backup_job_tokens (
  token uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  used_at timestamptz
);

REVOKE ALL ON public.backup_job_tokens FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.backup_job_tokens TO service_role;
ALTER TABLE public.backup_job_tokens ENABLE ROW LEVEL SECURITY;
-- No policies: only service_role (which bypasses RLS) may touch this table.