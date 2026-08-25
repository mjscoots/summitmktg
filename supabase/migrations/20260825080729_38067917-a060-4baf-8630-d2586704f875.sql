-- 1. Channels ---------------------------------------------------------------
INSERT INTO public.chat_channels (slug, label, icon, color, display_order, is_active)
VALUES
  ('wins', 'Wins', 'Trophy', 'text-amber-400', 2, true),
  ('leads', 'Leads', 'Users', 'text-primary', 3, true)
ON CONFLICT (slug) DO UPDATE SET is_active = true, label = EXCLUDED.label;

-- Auto channel per active team (backfill + future teams)
CREATE OR REPLACE FUNCTION public.team_channel_slug(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT 'team-' || regexp_replace(regexp_replace(lower(trim(_name)), '[^a-z0-9]+', '-', 'g'), '(^-|-$)', '', 'g')
$$;

INSERT INTO public.chat_channels (slug, label, icon, color, display_order, is_active)
SELECT public.team_channel_slug(t.name), t.name, 'Shield', 'text-primary', 20, true
FROM public.teams t
ON CONFLICT (slug) DO UPDATE SET is_active = true, label = EXCLUDED.label;

CREATE OR REPLACE FUNCTION public.sync_team_chat_channel()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.chat_channels (slug, label, icon, color, display_order, is_active)
  VALUES (public.team_channel_slug(NEW.name), NEW.name, 'Shield', 'text-primary', 20, true)
  ON CONFLICT (slug) DO UPDATE SET is_active = true, label = EXCLUDED.label;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_team_chat_channel ON public.teams;
CREATE TRIGGER trg_sync_team_chat_channel
AFTER INSERT OR UPDATE OF name ON public.teams
FOR EACH ROW EXECUTE FUNCTION public.sync_team_chat_channel();

-- Repair any message pointing at a channel that does not exist
UPDATE public.chat_messages m
SET channel = 'general'
WHERE NOT EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.slug = m.channel);

-- 2. Per-channel read state -------------------------------------------------
ALTER TABLE public.chat_read_state
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'general';

ALTER TABLE public.chat_read_state DROP CONSTRAINT IF EXISTS chat_read_state_pkey;
ALTER TABLE public.chat_read_state
  ADD CONSTRAINT chat_read_state_pkey PRIMARY KEY (user_id, channel);

-- 3. Unread helpers ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.visible_chat_channels(_user_id uuid)
RETURNS TABLE(slug text, label text, icon text, color text, display_order int)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (
    SELECT t.name AS team_name
    FROM public.profiles p
    LEFT JOIN public.teams t ON t.id = p.team_id
    WHERE p.user_id = _user_id
    LIMIT 1
  ),
  mgr AS (
    SELECT (public.has_role(_user_id, 'manager') OR public.has_role(_user_id, 'admin')
            OR public.has_role(_user_id, 'owner')) AS ok
  )
  SELECT c.slug, c.label, c.icon, c.color, c.display_order
  FROM public.chat_channels c, mgr
  WHERE c.is_active = true
    AND c.slug <> 'ai-coach'
    AND (
      c.slug NOT LIKE 'team-%'
      OR mgr.ok
      OR c.slug = public.team_channel_slug((SELECT team_name FROM me))
    )
  ORDER BY c.display_order, c.label
$$;

REVOKE ALL ON FUNCTION public.visible_chat_channels(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.visible_chat_channels(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_chat_channel_state()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _channels jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.display_order, x.label), '[]'::jsonb)
  INTO _channels
  FROM (
    SELECT v.slug, v.label, v.icon, v.color, v.display_order,
           (SELECT count(*)::int FROM public.chat_messages m
            WHERE m.channel = v.slug
              AND m.user_id <> _uid
              AND m.created_at > COALESCE(
                    (SELECT r.last_read_at FROM public.chat_read_state r
                     WHERE r.user_id = _uid AND r.channel = v.slug),
                    (SELECT r2.last_read_at FROM public.chat_read_state r2
                     WHERE r2.user_id = _uid AND r2.channel = 'general'),
                    now())
           ) AS unread
    FROM public.visible_chat_channels(_uid) v
  ) x;

  RETURN jsonb_build_object(
    'channels', _channels,
    'total_unread', (SELECT COALESCE(sum((c->>'unread')::int), 0) FROM jsonb_array_elements(_channels) c)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_chat_channel_state() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_chat_channel_state() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.mark_chat_channel_read(_channel text, _all boolean DEFAULT false)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF _all THEN
    INSERT INTO public.chat_read_state (user_id, channel, last_read_at)
    SELECT _uid, v.slug, now() FROM public.visible_chat_channels(_uid) v
    ON CONFLICT (user_id, channel) DO UPDATE SET last_read_at = now(), updated_at = now();
  ELSE
    IF _channel IS NULL OR _channel = '' THEN
      RETURN jsonb_build_object('success', false, 'error', 'Channel required');
    END IF;
    INSERT INTO public.chat_read_state (user_id, channel, last_read_at)
    VALUES (_uid, _channel, now())
    ON CONFLICT (user_id, channel) DO UPDATE SET last_read_at = now(), updated_at = now();
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_chat_channel_read(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_channel_read(text, boolean) TO authenticated, service_role;

-- 4. Wins auto-post --------------------------------------------------------
CREATE OR REPLACE FUNCTION public.post_win_to_chat()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rep uuid;
  _rep_name text;
  _source text;
  _first text;
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;
  IF NEW.status NOT IN ('Signed', 'Returning') THEN
    RETURN NEW;
  END IF;

  _rep := COALESCE(NEW.claimed_by, NEW.sourced_by, auth.uid());
  IF _rep IS NULL THEN
    RETURN NEW;
  END IF;

  -- One post per lead
  IF EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE channel = 'wins' AND content LIKE '[[WIN|' || NEW.id::text || '%'
  ) THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(full_name, 'A rep') INTO _rep_name FROM public.profiles WHERE user_id = _rep;
  _rep_name := COALESCE(_rep_name, 'A rep');
  _first := split_part(COALESCE(NEW.first_name, 'a recruit'), ' ', 1);

  _source := CASE
    WHEN COALESCE(NEW.ref_code, '') = 'winback' THEN 'win-back'
    WHEN COALESCE(NEW.ref_code, '') = 'pipeline-import' THEN 'pipeline'
    WHEN COALESCE(NEW.ref_code, '') = 'manual' THEN 'manual entry'
    WHEN COALESCE(NEW.ref_code, '') = '' THEN 'ticket'
    ELSE 'ticket ' || NEW.ref_code
  END;

  INSERT INTO public.chat_messages (user_id, content, is_ai, channel)
  VALUES (
    _rep,
    '[[WIN|' || NEW.id::text || ']]' || _rep_name || ' just signed ' || _first || ' — ' || _source,
    true,
    'wins'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_win_to_chat ON public.recruiting_leads;
CREATE TRIGGER trg_post_win_to_chat
AFTER UPDATE OF status ON public.recruiting_leads
FOR EACH ROW EXECUTE FUNCTION public.post_win_to_chat();

-- 5. Season sign count on the rep's own status update -----------------------
CREATE OR REPLACE FUNCTION public.update_my_lead(_lead_id uuid, _status text, _notes text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _row recruiting_leads;
  _signed int;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF _status IS NOT NULL AND _status NOT IN ('Claimed','Contacted','Booked','Signed','Dead') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  UPDATE recruiting_leads
  SET status = COALESCE(_status, status),
      notes = COALESCE(_notes, notes),
      last_activity_at = now()
  WHERE id = _lead_id AND claimed_by = _uid
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;

  SELECT count(*)::int INTO _signed
  FROM recruiting_leads
  WHERE status IN ('Signed','Returning')
    AND (claimed_by = _uid OR sourced_by = _uid);

  RETURN jsonb_build_object('success', true, 'lead', to_jsonb(_row), 'signed_count', _signed);
END;
$function$;

CREATE OR REPLACE FUNCTION public.my_signed_count()
RETURNS int
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT count(*)::int FROM public.recruiting_leads
  WHERE status IN ('Signed','Returning')
    AND (claimed_by = auth.uid() OR sourced_by = auth.uid())
$$;

REVOKE ALL ON FUNCTION public.my_signed_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.my_signed_count() TO authenticated, service_role;