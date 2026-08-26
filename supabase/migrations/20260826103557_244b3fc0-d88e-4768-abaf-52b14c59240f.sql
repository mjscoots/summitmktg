-- 1. phone visibility -------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.phone_visibility AS ENUM ('everyone','team','staff');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone_visibility public.phone_visibility NOT NULL DEFAULT 'team';

-- 2. staff / leader helpers -------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_chat_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _uid IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.user_id = _uid AND r.role::text IN ('owner','admin','president')
  );
$$;

-- true when _leader is above _person in the manages chain
CREATE OR REPLACE FUNCTION public.is_leader_of(_leader uuid, _person uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE ok boolean;
BEGIN
  IF _leader IS NULL OR _person IS NULL OR _leader = _person THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _person AND manager_id = _leader) THEN
    RETURN true;
  END IF;
  WITH RECURSIVE up AS (
    SELECT e.parent_user_id AS uid, 1 AS lvl
    FROM public.downline_edges e
    WHERE e.child_user_id = _person AND e.edge_type = 'manages'
    UNION ALL
    SELECT e.parent_user_id, u.lvl + 1
    FROM public.downline_edges e
    JOIN up u ON e.child_user_id = u.uid
    WHERE e.edge_type = 'manages' AND u.lvl < 10
  )
  SELECT EXISTS (SELECT 1 FROM up WHERE uid = _leader) INTO ok;
  RETURN COALESCE(ok, false);
END;
$$;

-- fix: the old body referenced downline_edges.ancestor_id / descendant_id,
-- which do not exist on that table.
CREATE OR REPLACE FUNCTION public.can_view_person(_user_id uuid)
RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN 'none'; END IF;
  IF public.has_role(v_me, 'owner') OR public.has_role(v_me, 'admin') THEN RETURN 'staff'; END IF;
  IF v_me = _user_id THEN RETURN 'self'; END IF;
  IF public.is_leader_of(v_me, _user_id) THEN RETURN 'manager'; END IF;
  RETURN 'none';
END;
$$;

CREATE OR REPLACE FUNCTION public.can_see_phone(_target uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _vis text; _t_team uuid; _m_team uuid;
BEGIN
  IF _me IS NULL OR _target IS NULL THEN RETURN false; END IF;
  IF _me = _target OR public.is_chat_staff(_me) THEN RETURN true; END IF;
  SELECT COALESCE(phone_visibility::text,'team'), team_id INTO _vis, _t_team
  FROM public.profiles WHERE user_id = _target;
  IF _vis IS NULL THEN RETURN false; END IF;
  IF _vis = 'everyone' THEN RETURN true; END IF;
  IF _vis = 'staff' THEN RETURN false; END IF;
  -- 'team': same team, or either person leads the other
  SELECT team_id INTO _m_team FROM public.profiles WHERE user_id = _me;
  RETURN (_t_team IS NOT NULL AND _t_team = _m_team)
      OR public.is_leader_of(_me, _target)
      OR public.is_leader_of(_target, _me);
END;
$$;

-- 3. direct messages --------------------------------------------------------
ALTER TABLE public.chat_channels
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'channel',
  ADD COLUMN IF NOT EXISTS member_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];

CREATE INDEX IF NOT EXISTS idx_chat_channels_members ON public.chat_channels USING gin (member_ids);

CREATE OR REPLACE FUNCTION public.can_chat_dm(_a uuid, _b uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _a IS NOT NULL AND _b IS NOT NULL AND _a <> _b AND (
    public.is_chat_staff(_a) OR public.is_chat_staff(_b)
    OR public.is_leader_of(_a, _b) OR public.is_leader_of(_b, _a)
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dm_member(_slug text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.chat_channels c
    WHERE c.slug = _slug AND c.kind = 'dm'
      AND (_uid = ANY (c.member_ids) OR public.is_chat_staff(_uid))
  );
$$;

CREATE OR REPLACE FUNCTION public.is_dm_channel(_slug text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.chat_channels c WHERE c.slug = _slug AND c.kind = 'dm');
$$;

CREATE OR REPLACE FUNCTION public.start_dm(_other uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid := auth.uid(); _slug text; _name text;
BEGIN
  IF _me IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  IF _other IS NULL OR _other = _me THEN RETURN jsonb_build_object('error','Pick someone else'); END IF;
  IF NOT public.can_chat_dm(_me, _other) THEN
    RETURN jsonb_build_object('error','Direct messages are between you and your leaders.');
  END IF;

  SELECT c.slug INTO _slug FROM public.chat_channels c
  WHERE c.kind = 'dm' AND c.member_ids @> ARRAY[_me, _other]::uuid[]
    AND array_length(c.member_ids, 1) = 2
  LIMIT 1;

  IF _slug IS NULL THEN
    SELECT full_name INTO _name FROM public.profiles WHERE user_id = _other;
    _slug := 'dm-' || replace(gen_random_uuid()::text, '-', '');
    INSERT INTO public.chat_channels (slug, label, icon, color, kind, member_ids, created_by, display_order)
    VALUES (_slug, COALESCE(_name, 'Direct message'), 'MessageSquare', 'text-foreground',
            'dm', ARRAY[_me, _other]::uuid[], _me, 900);
  END IF;

  RETURN jsonb_build_object('slug', _slug);
END;
$$;

-- channel visibility: DMs never appear in the public channel list
CREATE OR REPLACE FUNCTION public.visible_chat_channels(_user_id uuid)
RETURNS TABLE(slug text, label text, icon text, color text, display_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
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
    AND COALESCE(c.kind,'channel') <> 'dm'
    AND (
      c.slug NOT LIKE 'team-%'
      OR mgr.ok
      OR c.slug = public.team_channel_slug((SELECT team_name FROM me))
    )
  ORDER BY c.display_order, c.label
$$;

-- RLS: channel rows for DMs are members-only
DROP POLICY IF EXISTS "Authenticated users can view active channels" ON public.chat_channels;
CREATE POLICY "Authenticated users can view active channels"
  ON public.chat_channels FOR SELECT TO authenticated
  USING (
    is_active = true
    AND (COALESCE(kind,'channel') <> 'dm'
         OR auth.uid() = ANY (member_ids)
         OR public.is_chat_staff(auth.uid()))
  );

-- RLS: DM messages are members-only, both ways
DROP POLICY IF EXISTS "Authenticated users can view chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can view chat messages"
  ON public.chat_messages FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL
    AND (NOT public.is_dm_channel(channel) OR public.is_dm_member(channel, auth.uid()))
  );

DROP POLICY IF EXISTS "Authenticated users can insert chat messages" ON public.chat_messages;
CREATE POLICY "Authenticated users can insert chat messages"
  ON public.chat_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (NOT public.is_dm_channel(channel) OR public.is_dm_member(channel, auth.uid()))
  );

-- 4. message access for DMs -------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_read_channel(_channel text, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN _uid IS NULL THEN false
    WHEN public.is_dm_channel(_channel) THEN public.is_dm_member(_channel, _uid)
    WHEN _channel = 'ai-coach' THEN true
    ELSE EXISTS (SELECT 1 FROM public.visible_chat_channels(_uid) v WHERE v.slug = _channel)
  END;
$$;

CREATE OR REPLACE FUNCTION public.get_channel_messages(_channel text, _before timestamp with time zone DEFAULT now(), _limit integer DEFAULT 50)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _lim int := LEAST(GREATEST(COALESCE(_limit, 50), 1), 100);
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  IF NOT public.can_read_channel(_channel, _uid) THEN
    RETURN jsonb_build_object('error', 'No access');
  END IF;

  IF _channel = 'ai-coach' THEN
    RETURN jsonb_build_object('messages', '[]'::jsonb, 'has_more', false);
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(y)::jsonb ORDER BY y.created_at), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT m.id, m.user_id, m.content, m.is_ai, m.created_at, m.reply_to,
           m.channel, COALESCE(m.is_pinned, false) AS is_pinned,
           COALESCE(m.kind,'text') AS kind, m.ref_id, m.meta,
           CASE WHEN m.is_ai THEN 'Summit AI' ELSE p.full_name END AS sender_name,
           p.avatar_url AS sender_avatar,
           p.is_active_now AS sender_active,
           COALESCE(p.archived, false) AS sender_archived,
           (SELECT r.role::text FROM public.user_roles r
             WHERE r.user_id = m.user_id
             ORDER BY CASE r.role::text
               WHEN 'owner' THEN 4 WHEN 'admin' THEN 3 WHEN 'manager' THEN 2 ELSE 1 END DESC
             LIMIT 1) AS sender_role,
           rp.id AS reply_id,
           CASE WHEN rp.is_ai THEN 'Summit AI' ELSE rpp.full_name END AS reply_sender,
           left(rp.content, 80) AS reply_excerpt,
           COALESCE((
             SELECT jsonb_agg(jsonb_build_object('emoji', g.emoji, 'count', g.cnt, 'mine', g.mine)
                              ORDER BY g.emoji)
             FROM (
               SELECT cr.emoji, count(*)::int AS cnt, bool_or(cr.user_id = _uid) AS mine
               FROM public.chat_reactions cr
               WHERE cr.message_id = m.id
               GROUP BY cr.emoji
             ) g
           ), '[]'::jsonb) AS reactions
    FROM public.chat_messages m
    LEFT JOIN public.profiles p ON p.user_id = m.user_id
    LEFT JOIN public.chat_messages rp ON rp.id = m.reply_to
    LEFT JOIN public.profiles rpp ON rpp.user_id = rp.user_id
    WHERE m.channel = _channel
      AND m.created_at < COALESCE(_before, now())
    ORDER BY m.created_at DESC
    LIMIT _lim
  ) y;

  RETURN jsonb_build_object(
    'messages', _rows,
    'has_more', jsonb_array_length(_rows) = _lim
  );
END;
$$;

-- 5. conversations, now including DMs --------------------------------------
CREATE OR REPLACE FUNCTION public.get_conversations()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _vert text;
  _rows jsonb;
  _dms jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  _vert := public.my_active_vertical();

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.display_order, x.label), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT v.slug,
           v.label,
           v.icon,
           v.color,
           v.display_order,
           CASE WHEN v.slug LIKE 'team-%' THEN 'team' ELSE 'channel' END AS kind,
           false AS is_pinned,
           NULL::text AS avatar_url,
           NULL::uuid AS other_user_id,
           lm.content AS last_content,
           lm.created_at AS last_at,
           CASE WHEN lm.is_ai THEN 'Summit AI' ELSE lp.full_name END AS last_sender,
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
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id, m.is_ai
      FROM public.chat_messages m
      WHERE m.channel = v.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
    WHERE EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.slug = v.slug
        AND (c.vertical IS NULL OR c.vertical = _vert)
    )
    OR NOT EXISTS (SELECT 1 FROM public.chat_channels c2 WHERE c2.slug = v.slug)
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(d)::jsonb ORDER BY d.last_at DESC NULLS LAST, d.label), '[]'::jsonb)
  INTO _dms
  FROM (
    SELECT c.slug,
           COALESCE(op.full_name, c.label) AS label,
           'MessageSquare'::text AS icon,
           'text-foreground'::text AS color,
           900 AS display_order,
           'dm'::text AS kind,
           false AS is_pinned,
           op.avatar_url,
           other.uid AS other_user_id,
           lm.content AS last_content,
           lm.created_at AS last_at,
           lp.full_name AS last_sender,
           (SELECT count(*)::int FROM public.chat_messages m
             WHERE m.channel = c.slug
               AND m.user_id <> _uid
               AND m.created_at > COALESCE(
                     (SELECT r.last_read_at FROM public.chat_read_state r
                      WHERE r.user_id = _uid AND r.channel = c.slug),
                     '-infinity'::timestamptz)
           ) AS unread
    FROM public.chat_channels c
    CROSS JOIN LATERAL (
      SELECT (SELECT u FROM unnest(c.member_ids) u WHERE u <> _uid LIMIT 1) AS uid
    ) other
    LEFT JOIN public.profiles op ON op.user_id = other.uid
    LEFT JOIN LATERAL (
      SELECT m.content, m.created_at, m.user_id
      FROM public.chat_messages m
      WHERE m.channel = c.slug
      ORDER BY m.created_at DESC
      LIMIT 1
    ) lm ON true
    LEFT JOIN public.profiles lp ON lp.user_id = lm.user_id
    WHERE c.kind = 'dm'
      AND c.is_active = true
      AND (_uid = ANY (c.member_ids) OR public.is_chat_staff(_uid))
  ) d;

  _rows := _rows || _dms;

  RETURN jsonb_build_object(
    'conversations', _rows,
    'total_unread', (SELECT COALESCE(sum((c->>'unread')::int), 0) FROM jsonb_array_elements(_rows) c)
  );
END;
$$;

-- 6. people search ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.search_people(_q text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _like text;
  _people jsonb;
  _dir jsonb;
  _emails jsonb;
  _events jsonb;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  IF _q IS NULL OR length(btrim(_q)) < 2 THEN
    RETURN jsonb_build_object('people','[]'::jsonb,'directory','[]'::jsonb,'emails','[]'::jsonb,'events','[]'::jsonb);
  END IF;
  _like := '%' || btrim(_q) || '%';

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.full_name), '[]'::jsonb)
  INTO _people
  FROM (
    SELECT p.user_id,
           p.full_name,
           p.avatar_url,
           COALESCE(public.get_user_role(p.user_id)::text, 'rookie') AS role,
           t.name AS team_name,
           CASE WHEN public.can_see_phone(p.user_id) THEN p.phone ELSE NULL END AS phone,
           public.can_chat_dm(_uid, p.user_id) AS can_dm,
           public.can_view_person(p.user_id) AS view_level
    FROM public.profiles p
    LEFT JOIN public.teams t ON t.id = p.team_id
    WHERE COALESCE(p.archived, false) = false
      AND p.status <> 'nlc'
      AND p.full_name ILIKE _like
      AND p.user_id IS NOT NULL
    ORDER BY p.full_name
    LIMIT 20
  ) x;

  SELECT COALESCE(jsonb_agg(row_to_json(y)::jsonb ORDER BY y.display_order, y.name), '[]'::jsonb)
  INTO _dir
  FROM (
    SELECT n.id, n.name, n.phone, n.label, COALESCE(n.display_order, 0) AS display_order
    FROM public.phone_numbers n
    WHERE n.is_active = true AND (n.name ILIKE _like OR n.label ILIKE _like OR n.phone ILIKE _like)
    LIMIT 20
  ) y;

  SELECT COALESCE(jsonb_agg(row_to_json(z)::jsonb ORDER BY z.display_order, z.name), '[]'::jsonb)
  INTO _emails
  FROM (
    SELECT e.id, e.name, e.email, e.label, COALESCE(e.display_order, 0) AS display_order
    FROM public.managed_emails e
    WHERE e.is_active = true AND (e.name ILIKE _like OR e.label ILIKE _like OR e.email ILIKE _like)
    LIMIT 20
  ) z;

  SELECT COALESCE(jsonb_agg(row_to_json(v)::jsonb ORDER BY v.event_date), '[]'::jsonb)
  INTO _events
  FROM (
    SELECT ev.id, ev.title, ev.event_date, ev.location, ev.event_kind
    FROM public.calendar_events ev
    WHERE ev.title ILIKE _like
      AND COALESCE(ev.is_cancelled, false) = false
      AND ev.event_date >= now() - interval '1 day'
      AND public.can_view_event(ev.scope, ev.team_id, _uid)
    ORDER BY ev.event_date
    LIMIT 10
  ) v;

  RETURN jsonb_build_object('people', _people, 'directory', _dir, 'emails', _emails, 'events', _events);
END;
$$;

-- 7. grants ----------------------------------------------------------------
REVOKE ALL ON FUNCTION public.is_chat_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_leader_of(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_dm_member(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_dm_channel(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_read_channel(text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.can_chat_dm(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_chat_staff(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_leader_of(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_dm_member(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.is_dm_channel(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_read_channel(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.can_chat_dm(uuid, uuid) TO service_role;

REVOKE ALL ON FUNCTION public.can_see_phone(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.search_people(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.start_dm(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_conversations() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_channel_messages(text, timestamptz, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.visible_chat_channels(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.can_view_person(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_see_phone(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.search_people(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.start_dm(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_conversations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_channel_messages(text, timestamptz, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.visible_chat_channels(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.can_view_person(uuid) TO authenticated, service_role;