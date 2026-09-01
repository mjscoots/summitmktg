-- 0. Lock repair: the weekly digest is cron only.
REVOKE EXECUTE ON FUNCTION public.post_weekly_digest() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.post_weekly_digest() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.post_weekly_digest() FROM anon;

-- 1. Extend the existing invites table.
ALTER TABLE public.invites
  ADD COLUMN IF NOT EXISTS invitee_first_name text,
  ADD COLUMN IF NOT EXISTS invitee_last_name text,
  ADD COLUMN IF NOT EXISTS invitee_phone text,
  ADD COLUMN IF NOT EXISTS opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS joined_user_id uuid,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'Sent';

ALTER TABLE public.invites DROP CONSTRAINT IF EXISTS invites_status_check;
ALTER TABLE public.invites
  ADD CONSTRAINT invites_status_check CHECK (status IN ('Sent','Opened','Joined','Revoked'));

CREATE UNIQUE INDEX IF NOT EXISTS invites_token_key ON public.invites (token);

-- Keep the plain status in step with the timestamps, whatever writes them.
CREATE OR REPLACE FUNCTION public.invites_sync_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.used_at IS NOT NULL OR NEW.joined_user_id IS NOT NULL THEN
    NEW.status := 'Joined';
    NEW.joined_user_id := COALESCE(NEW.joined_user_id, NEW.used_by);
    NEW.used_by := COALESCE(NEW.used_by, NEW.joined_user_id);
    NEW.used_at := COALESCE(NEW.used_at, now());
  ELSIF NEW.revoked_at IS NOT NULL THEN
    NEW.status := 'Revoked';
  ELSIF NEW.opened_at IS NOT NULL THEN
    NEW.status := 'Opened';
  ELSE
    NEW.status := 'Sent';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS invites_sync_status ON public.invites;
CREATE TRIGGER invites_sync_status
BEFORE INSERT OR UPDATE ON public.invites
FOR EACH ROW EXECUTE FUNCTION public.invites_sync_status();

-- 2. Token lookup: the only invite function the signed out invitee may call.
CREATE OR REPLACE FUNCTION public.invite_lookup(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inv public.invites; inviter text;
BEGIN
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

  -- First open stamps the invite. Nothing is burned here.
  IF inv.opened_at IS NULL THEN
    UPDATE public.invites SET opened_at = now() WHERE id = inv.id;
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

REVOKE EXECUTE ON FUNCTION public.invite_lookup(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invite_lookup(text) TO anon, authenticated;

-- 3. Create an invite. Manager tier and above only.
CREATE OR REPLACE FUNCTION public.create_invite(
  _first_name text,
  _last_name text DEFAULT NULL,
  _phone text DEFAULT NULL,
  _vertical text DEFAULT NULL,
  _team_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _staff boolean;
  _vert text;
  _token text;
BEGIN
  IF _me IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  _staff := public.has_role(_me,'admin') OR public.has_role(_me,'owner');
  IF NOT (_staff OR public.has_role(_me,'manager') OR public.has_role(_me,'president')
          OR public.is_effective_manager(_me)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF coalesce(trim(_first_name),'') = '' THEN RAISE EXCEPTION 'A first name is required'; END IF;

  _vert := coalesce(nullif(trim(coalesce(_vertical,'')),''),
                    (SELECT coalesce(active_vertical, vertical) FROM public.profiles WHERE user_id = _me),
                    'Pest');
  IF _vert NOT IN ('Pest','Fiber','Life') THEN RAISE EXCEPTION 'Unknown workspace'; END IF;
  IF NOT (_staff OR public.is_vertical_member(_me, _vert)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  _token := public.new_invite_token();

  INSERT INTO public.invites (
    token, created_by, role, vertical, team_id, manager_id,
    invitee_first_name, invitee_last_name, invitee_phone, expires_at
  )
  VALUES (
    _token, _me, 'rep', _vert, _team_id, _me,
    trim(_first_name), nullif(trim(coalesce(_last_name,'')),''),
    nullif(trim(coalesce(_phone,'')),''), now() + interval '7 days'
  );

  RETURN jsonb_build_object('token', _token, 'vertical', _vert);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.create_invite(text, text, text, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_invite(text, text, text, text, uuid) TO authenticated;

-- 4. My invites, and the whole list for owner and admin.
CREATE OR REPLACE FUNCTION public.my_invites()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb)
  FROM (
    SELECT jsonb_build_object(
      'id', i.id, 'token', i.token, 'status', i.status,
      'first_name', i.invitee_first_name, 'last_name', i.invitee_last_name,
      'vertical', i.vertical, 'team_name', t.name,
      'created_at', i.created_at, 'expires_at', i.expires_at,
      'joined_name', p.full_name
    ) AS x
    FROM public.invites i
    LEFT JOIN public.teams t ON t.id = i.team_id
    LEFT JOIN public.profiles p ON p.user_id = i.joined_user_id
    WHERE i.created_by = auth.uid()
  ) s;
$$;

REVOKE EXECUTE ON FUNCTION public.my_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_invites() TO authenticated;

CREATE OR REPLACE FUNCTION public.all_invites()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _out jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  SELECT coalesce(jsonb_agg(x ORDER BY x->>'created_at' DESC), '[]'::jsonb) INTO _out
  FROM (
    SELECT jsonb_build_object(
      'id', i.id, 'token', i.token, 'status', i.status,
      'first_name', i.invitee_first_name, 'last_name', i.invitee_last_name,
      'vertical', i.vertical, 'team_name', t.name,
      'created_at', i.created_at, 'expires_at', i.expires_at,
      'inviter_name', inviter.full_name,
      'joined_name', p.full_name
    ) AS x
    FROM public.invites i
    LEFT JOIN public.teams t ON t.id = i.team_id
    LEFT JOIN public.profiles inviter ON inviter.user_id = i.created_by
    LEFT JOIN public.profiles p ON p.user_id = i.joined_user_id
  ) s;
  RETURN _out;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.all_invites() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.all_invites() TO authenticated;

-- 5. Revoke: the inviter, or owner and admin. Never another inviter's row.
CREATE OR REPLACE FUNCTION public.revoke_invite(_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE inv public.invites; _staff boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not allowed'; END IF;
  _staff := public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner');
  SELECT * INTO inv FROM public.invites WHERE id = _id;
  IF inv.id IS NULL THEN RAISE EXCEPTION 'No such invite'; END IF;
  IF NOT (_staff OR inv.created_by = auth.uid()) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  IF inv.joined_user_id IS NOT NULL OR inv.used_at IS NOT NULL THEN
    RETURN jsonb_build_object('status','already_joined');
  END IF;
  UPDATE public.invites SET revoked_at = coalesce(revoked_at, now()) WHERE id = _id;
  RETURN jsonb_build_object('status','ok');
END;
$$;

REVOKE EXECUTE ON FUNCTION public.revoke_invite(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_invite(uuid) TO authenticated;

-- 6. Single use, enforced in the database: the invite carries the inviter as the
-- manager when none was named, and finalizing an already used token does nothing.
CREATE OR REPLACE FUNCTION public.redeem_invite(p_token text, p_first_name text, p_last_name text, p_email text, p_phone text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  IF inv.used_at IS NOT NULL OR inv.joined_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('status','used');
  END IF;
  IF inv.expires_at < now() THEN RETURN jsonb_build_object('status','expired'); END IF;

  IF EXISTS (SELECT 1 FROM public.profiles WHERE lower(email) = lower(trim(p_email))) THEN
    RETURN jsonb_build_object('status','account_exists');
  END IF;

  RETURN jsonb_build_object(
    'status','ok','invite_id',inv.id,'role',inv.role,'vertical',inv.vertical,
    'team_id',inv.team_id,'region',inv.region,
    'manager_id', coalesce(inv.manager_id, inv.created_by),
    'created_by',inv.created_by,
    'full_name', trim(p_first_name) || ' ' || trim(p_last_name),
    'email', lower(trim(p_email)), 'phone', nullif(trim(coalesce(p_phone,'')),'')
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.finalize_invite(p_token text, p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.invites
     SET used_by = p_user_id, used_at = now(), joined_user_id = p_user_id
   WHERE token = p_token AND used_at IS NULL AND joined_user_id IS NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.finalize_invite(text, uuid) FROM PUBLIC, anon, authenticated;