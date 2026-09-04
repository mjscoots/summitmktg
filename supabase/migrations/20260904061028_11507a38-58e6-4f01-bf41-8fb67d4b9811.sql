-- 1. Applications: no anon insert. The submit-application edge function inserts with the service role.
DROP POLICY IF EXISTS "Anyone can submit applications" ON public.applications;

-- 2. Staff notified on every new application.
CREATE OR REPLACE FUNCTION public.notify_new_application()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_notifications (user_id, title, message, link, source_key)
  SELECT DISTINCT ur.user_id,
         'New application',
         NEW.full_name || ' applied for ' || COALESCE(NEW.vertical, 'not sure yet') || '.',
         '/app/admin-team?tab=applications',
         'application_' || NEW.id::text
  FROM public.user_roles ur
  WHERE ur.role IN ('owner','admin')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_application() FROM PUBLIC, anon;

DROP TRIGGER IF EXISTS notify_new_application_trg ON public.applications;
CREATE TRIGGER notify_new_application_trg
AFTER INSERT ON public.applications
FOR EACH ROW EXECUTE FUNCTION public.notify_new_application();

-- 3. Anon function grants: revoke from PUBLIC and anon, keep authenticated and service_role.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure AS sig
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN (
        'validate_access_code','ingest_pest_revenue','ingest_fiber_week','undo_import_batch',
        'mark_mastery_check','set_appearance','get_money_sources','get_import_batches',
        'resolve_sheet_manager','lead_system_for','region_lead_of','is_paired_manager_of',
        'has_role','is_staff','is_manager_tier','is_vertical_lead','is_president_of_vertical',
        'get_ticket_config','get_ticket_series_status','resolve_source_code'
      )
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', r.sig);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated', r.sig);
    EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO service_role', r.sig);
  END LOOP;
END $$;

-- 4. Pillar links expire after 90 days.
ALTER TABLE public.pillar_links
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days');

CREATE OR REPLACE FUNCTION public.pillar_link_lookup(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'valid', l.expires_at > now(),
      'pillar_name', t.name,
      'vertical', t.vertical,
      'expires_at', l.expires_at
    )
    FROM public.pillar_links l
    JOIN public.teams t ON t.id = l.team_id
    WHERE l.token = p_token
      AND COALESCE(t.retired, false) = false
    LIMIT 1
  ), jsonb_build_object('valid', false));
$$;

CREATE OR REPLACE FUNCTION public.pillar_link_resolve(p_token text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT jsonb_build_object(
      'valid', l.expires_at > now(),
      'team_id', t.id,
      'pillar_name', t.name,
      'vertical', t.vertical,
      'leader_id', t.leader_id,
      'expires_at', l.expires_at
    )
    FROM public.pillar_links l
    JOIN public.teams t ON t.id = l.team_id
    WHERE l.token = p_token AND COALESCE(t.retired, false) = false
    LIMIT 1
  ), jsonb_build_object('valid', false));
$$;

CREATE OR REPLACE FUNCTION public.pillar_link_ensure(_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _tok text; _exp timestamptz;
BEGIN
  IF NOT public.can_manage_pillar(_uid, _team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this pillar leader or the owner can do that.');
  END IF;
  SELECT token, expires_at INTO _tok, _exp FROM public.pillar_links WHERE team_id = _team_id;
  IF _tok IS NULL THEN
    _tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.pillar_links (team_id, token, created_by, expires_at)
    VALUES (_team_id, _tok, _uid, now() + interval '90 days')
    RETURNING expires_at INTO _exp;
  ELSIF _exp <= now() THEN
    UPDATE public.pillar_links
       SET expires_at = now() + interval '90 days', updated_at = now()
     WHERE team_id = _team_id
    RETURNING expires_at INTO _exp;
  END IF;
  RETURN jsonb_build_object('success', true, 'token', _tok, 'expires_at', _exp);
END;
$$;

CREATE OR REPLACE FUNCTION public.pillar_link_regenerate(_team_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _tok text := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  _exp timestamptz := now() + interval '90 days';
BEGIN
  IF NOT public.can_manage_pillar(_uid, _team_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only this pillar leader or the owner can do that.');
  END IF;
  INSERT INTO public.pillar_links (team_id, token, created_by, expires_at)
  VALUES (_team_id, _tok, _uid, _exp)
  ON CONFLICT (team_id) DO UPDATE
    SET token = _tok, created_by = _uid, expires_at = _exp, updated_at = now();
  RETURN jsonb_build_object('success', true, 'token', _tok, 'expires_at', _exp);
END;
$$;

CREATE OR REPLACE FUNCTION public.my_pillars()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'team_id', t.id,
      'name', t.name,
      'vertical', t.vertical,
      'leader_id', t.leader_id,
      'leader_name', (SELECT p.full_name FROM public.profiles p WHERE p.user_id = t.leader_id),
      'token', l.token,
      'expires_at', l.expires_at
    ) ORDER BY t.name)
    FROM public.teams t
    LEFT JOIN public.pillar_links l ON l.team_id = t.id
    WHERE COALESCE(t.retired, false) = false
      AND auth.uid() IS NOT NULL
      AND (public.has_role(auth.uid(),'owner') OR t.leader_id = auth.uid())
  ), '[]'::jsonb);
$$;

-- 5. invite_lookup: rate limited per visitor, opened_at written once.
CREATE OR REPLACE FUNCTION public.invite_lookup(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE inv public.invites; inviter text; _ip text; _allowed boolean;
BEGIN
  BEGIN
    _ip := split_part(COALESCE(current_setting('request.headers', true)::json->>'x-forwarded-for', 'unknown'), ',', 1);
  EXCEPTION WHEN others THEN
    _ip := 'unknown';
  END;
  SELECT public.check_rate_limit('invite_lookup_ip_' || COALESCE(NULLIF(trim(_ip), ''), 'unknown'), 20, 3600)
    INTO _allowed;
  IF _allowed IS FALSE THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'rate_limited');
  END IF;

  SELECT * INTO inv FROM public.invites WHERE token = p_token;
  IF inv.id IS NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'invalid');
  END IF;
  IF inv.revoked_at IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'revoked');
  END IF;
  IF inv.used_at IS NOT NULL OR inv.joined_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'used');
  END IF;
  IF inv.expires_at < now() THEN
    RETURN jsonb_build_object('valid', false, 'reason', 'expired');
  END IF;

  -- The first open stamps the invite. Nothing is burned here and no later call rewrites it.
  IF inv.opened_at IS NULL THEN
    UPDATE public.invites SET opened_at = now() WHERE id = inv.id AND opened_at IS NULL;
  END IF;

  SELECT split_part(full_name, ' ', 1) INTO inviter
  FROM public.profiles WHERE user_id = inv.created_by;

  RETURN jsonb_build_object(
    'valid', true,
    'first_name', inv.invitee_first_name,
    'vertical', inv.vertical,
    'inviter_first_name', inviter
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_lookup(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pillar_link_lookup(text) TO anon, authenticated;