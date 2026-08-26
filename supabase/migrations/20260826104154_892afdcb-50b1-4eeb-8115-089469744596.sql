-- can_see_phone takes only the target; the previous edit called it with two args.
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
      AND public.can_view_person(p.user_id)
    LIMIT 20
  ) s;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', pn.id, 'label', pn.label, 'number', pn.number, 'notes', pn.notes
         ) ORDER BY pn.label), '[]'::jsonb) INTO _directory
  FROM phone_numbers pn
  WHERE pn.is_active AND (pn.label ILIKE _like OR pn.number ILIKE _like);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', me.id, 'label', me.label, 'email', me.email
         ) ORDER BY me.label), '[]'::jsonb) INTO _emails
  FROM managed_emails me
  WHERE me.is_active AND (me.label ILIKE _like OR me.email ILIKE _like);

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', ce.id, 'title', ce.title, 'starts_at', ce.starts_at,
           'location', ce.location, 'event_type', ce.event_type
         ) ORDER BY ce.starts_at), '[]'::jsonb) INTO _events
  FROM calendar_events ce
  WHERE ce.title ILIKE _like
    AND coalesce(ce.is_cancelled, false) = false
    AND ce.starts_at > now() - interval '1 day'
    AND public.can_view_event(ce.id, _uid)
  LIMIT 10;

  RETURN jsonb_build_object('people', _people, 'directory', _directory,
                            'emails', _emails, 'events', _events);
END;
$$;

REVOKE ALL ON FUNCTION public.search_people(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.search_people(text) TO authenticated;