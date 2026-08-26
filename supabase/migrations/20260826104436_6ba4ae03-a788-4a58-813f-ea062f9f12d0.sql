-- Directory visibility. can_view_person only looks downward, so a rep could not
-- find their own manager. A separate helper keeps that function untouched and adds
-- the directions a directory needs: my leaders, my teammates, and staff.
CREATE OR REPLACE FUNCTION public.can_find_person(_target uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _my_team uuid;
  _their_team uuid;
BEGIN
  IF _me IS NULL OR _target IS NULL THEN RETURN false; END IF;
  IF coalesce(public.can_view_person(_target), 'none') <> 'none' THEN RETURN true; END IF;
  IF public.is_leader_of(_target, _me) THEN RETURN true; END IF;
  IF public.has_role(_target, 'owner') OR public.has_role(_target, 'admin')
     OR public.has_role(_target, 'president') THEN RETURN true; END IF;
  SELECT team_id INTO _my_team FROM profiles WHERE user_id = _me;
  SELECT team_id INTO _their_team FROM profiles WHERE user_id = _target;
  RETURN _my_team IS NOT NULL AND _my_team = _their_team;
END;
$$;

REVOKE ALL ON FUNCTION public.can_find_person(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_find_person(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.search_people(_q text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _like text := '%' || btrim(coalesce(_q, '')) || '%';
  _people jsonb;
  _directory jsonb;
  _emails jsonb;
  _events jsonb;
BEGIN
  IF _uid IS NULL OR length(btrim(coalesce(_q, ''))) < 2 THEN
    RETURN jsonb_build_object('people', '[]'::jsonb, 'directory', '[]'::jsonb,
                              'emails', '[]'::jsonb, 'events', '[]'::jsonb);
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'full_name'), '[]'::jsonb) INTO _people
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.user_id,
      'full_name', p.full_name,
      'avatar_url', p.avatar_url,
      'role', (SELECT ur.role::text FROM user_roles ur WHERE ur.user_id = p.user_id ORDER BY ur.role LIMIT 1),
      'team_name', t.name,
      'phone', CASE WHEN public.can_see_phone(p.user_id) THEN p.phone ELSE NULL END,
      'can_dm', public.can_chat_dm(_uid, p.user_id),
      'view_level', coalesce(p.phone_visibility::text, 'team')
    ) AS x
    FROM profiles p
    LEFT JOIN teams t ON t.id = p.team_id
    WHERE p.full_name ILIKE _like
      AND coalesce(p.status::text, '') <> 'nlc'
      AND public.can_find_person(p.user_id)
    LIMIT 20
  ) s;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', pn.id, 'label', coalesce(pn.label, pn.name), 'number', pn.phone
         ) ORDER BY pn.name), '[]'::jsonb) INTO _directory
  FROM phone_numbers pn
  WHERE pn.is_active AND (pn.name ILIKE _like OR pn.phone ILIKE _like OR coalesce(pn.label,'') ILIKE _like);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', me.id, 'label', coalesce(me.label, me.name), 'email', me.email
         ) ORDER BY me.name), '[]'::jsonb) INTO _emails
  FROM managed_emails me
  WHERE me.is_active AND (me.name ILIKE _like OR me.email ILIKE _like OR coalesce(me.label,'') ILIKE _like);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', ce.id, 'title', ce.title, 'starts_at', ce.event_date,
           'location', ce.location, 'event_type', ce.event_type
         ) ORDER BY ce.event_date), '[]'::jsonb) INTO _events
  FROM calendar_events ce
  WHERE ce.title ILIKE _like
    AND coalesce(ce.is_cancelled, false) = false
    AND ce.event_date > now() - interval '1 day'
    AND public.can_view_event(coalesce(ce.scope, 'company'), ce.team_id, _uid)
  LIMIT 10;

  RETURN jsonb_build_object('people', _people, 'directory', _directory,
                            'emails', _emails, 'events', _events);
END;
$$;

REVOKE ALL ON FUNCTION public.search_people(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people(text) TO authenticated;