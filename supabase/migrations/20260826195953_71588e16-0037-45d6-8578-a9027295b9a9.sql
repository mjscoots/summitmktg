CREATE TABLE IF NOT EXISTS public.invites (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  created_by uuid not null references auth.users(id) on delete cascade,
  role text not null default 'rep',
  vertical text,
  team_id uuid,
  region text,
  manager_id uuid,
  note text,
  expires_at timestamptz not null default now() + interval '7 days',
  used_by uuid,
  used_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

GRANT SELECT, INSERT, UPDATE ON public.invites TO authenticated;
GRANT ALL ON public.invites TO service_role;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invites_admin_all" ON public.invites FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "invites_manager_read_own" ON public.invites FOR SELECT TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "invites_manager_create" ON public.invites FOR INSERT TO authenticated
WITH CHECK (
  created_by = auth.uid()
  AND role = 'rep'
  AND manager_id = auth.uid()
  AND public.has_role(auth.uid(), 'manager')
  AND vertical IS NOT NULL
  AND vertical = (SELECT active_vertical FROM public.profiles WHERE user_id = auth.uid())
  AND (team_id IS NULL OR team_id = (SELECT team_id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "invites_manager_revoke_own" ON public.invites FOR UPDATE TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE INDEX IF NOT EXISTS invites_created_by_idx ON public.invites(created_by);

-- Server-side token generation
CREATE OR REPLACE FUNCTION public.new_invite_token()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  alphabet text := 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789-_';
  out text := '';
  i int;
BEGIN
  FOR i IN 1..24 LOOP
    out := out || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  END LOOP;
  IF EXISTS (SELECT 1 FROM public.invites WHERE token = out) THEN
    RETURN public.new_invite_token();
  END IF;
  RETURN out;
END;
$$;
REVOKE ALL ON FUNCTION public.new_invite_token() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.new_invite_token() TO authenticated, service_role;

-- Public-facing invite summary (no ids leaked beyond what the page shows)
CREATE OR REPLACE FUNCTION public.invite_preview(p_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invites; t text; inviter text;
BEGIN
  SELECT * INTO inv FROM public.invites WHERE token = p_token;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF inv.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status','revoked'); END IF;
  IF inv.used_at IS NOT NULL THEN RETURN jsonb_build_object('status','used'); END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('status','expired'); END IF;
  SELECT name INTO t FROM public.teams WHERE id = inv.team_id;
  SELECT full_name INTO inviter FROM public.profiles WHERE user_id = inv.created_by;
  RETURN jsonb_build_object(
    'status','ok','role',inv.role,'vertical',inv.vertical,
    'team_name',t,'region',inv.region,'inviter',inviter
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.invite_preview(text) TO anon, authenticated, service_role;

-- Claim: validates, rate limits, and locks the invite for account creation
CREATE OR REPLACE FUNCTION public.redeem_invite(
  p_token text, p_first_name text, p_last_name text, p_email text, p_phone text
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE inv public.invites;
BEGIN
  IF NOT public.check_rate_limit('invite_redeem_' || p_token, 5, 3600) THEN
    RETURN jsonb_build_object('status','rate_limited');
  END IF;
  IF coalesce(trim(p_first_name),'') = '' OR coalesce(trim(p_last_name),'') = ''
     OR coalesce(trim(p_email),'') = '' THEN
    RETURN jsonb_build_object('status','invalid_input');
  END IF;

  SELECT * INTO inv FROM public.invites WHERE token = p_token FOR UPDATE;
  IF inv.id IS NULL THEN RETURN jsonb_build_object('status','invalid'); END IF;
  IF inv.revoked_at IS NOT NULL THEN RETURN jsonb_build_object('status','revoked'); END IF;
  IF inv.used_at IS NOT NULL THEN RETURN jsonb_build_object('status','used'); END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('status','expired'); END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(trim(p_email))) THEN
    RETURN jsonb_build_object('status','account_exists');
  END IF;

  RETURN jsonb_build_object(
    'status','ok','invite_id',inv.id,'role',inv.role,'vertical',inv.vertical,
    'team_id',inv.team_id,'region',inv.region,'manager_id',inv.manager_id,
    'created_by',inv.created_by,
    'full_name', trim(p_first_name) || ' ' || trim(p_last_name),
    'email', lower(trim(p_email)), 'phone', nullif(trim(coalesce(p_phone,'')),'')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.redeem_invite(text,text,text,text,text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.finalize_invite(p_token text, p_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.invites SET used_by = p_user_id, used_at = now()
  WHERE token = p_token AND used_at IS NULL;
END;
$$;
REVOKE ALL ON FUNCTION public.finalize_invite(text,uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_invite(text,uuid) TO service_role;