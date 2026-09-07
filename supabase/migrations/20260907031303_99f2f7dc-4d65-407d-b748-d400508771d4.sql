ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_open_at timestamptz;

CREATE OR REPLACE FUNCTION public.mark_first_open()
RETURNS timestamptz
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _me uuid := auth.uid();
  _at timestamptz;
BEGIN
  IF _me IS NULL THEN RETURN NULL; END IF;

  SELECT first_open_at INTO _at FROM public.profiles WHERE user_id = _me;
  IF _at IS NOT NULL THEN RETURN _at; END IF;

  UPDATE public.profiles
  SET first_open_at = now()
  WHERE user_id = _me AND first_open_at IS NULL
  RETURNING first_open_at INTO _at;

  RETURN _at;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.mark_first_open() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mark_first_open() TO authenticated;

CREATE OR REPLACE FUNCTION public.my_resign_intent()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _status text;
  _created timestamptz;
BEGIN
  IF _me IS NULL THEN RETURN jsonb_build_object(); END IF;
  SELECT status, created_at INTO _status, _created
  FROM public.resign_intents
  WHERE user_id = _me
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN jsonb_build_object('status', _status, 'created_at', _created);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.my_resign_intent() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_resign_intent() TO authenticated;

CREATE OR REPLACE FUNCTION public.run_notification_digest()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  made int := 0;
BEGIN
  FOR r IN
    SELECT user_id,
           count(*)::int AS cnt,
           min(deliver_after) AS deliver_at,
           string_agg(DISTINCT title, ', ') AS titles
    FROM public.user_notifications
    WHERE digested = false
      AND is_digest = false
      AND urgent = false
      AND is_read = false
      AND deliver_after > now()
    GROUP BY user_id
    HAVING count(*) >= 3
  LOOP
    UPDATE public.user_notifications
    SET digested = true
    WHERE user_id = r.user_id
      AND digested = false
      AND is_digest = false
      AND urgent = false
      AND is_read = false
      AND deliver_after > now();

    INSERT INTO public.user_notifications (user_id, title, message, link, urgent, is_digest, deliver_after, source_key)
    VALUES (
      r.user_id,
      r.cnt || ' updates while you were off',
      left(r.titles, 300),
      '/app',
      false,
      true,
      r.deliver_at,
      'digest:offline:' || r.user_id::text || ':' || (now() AT TIME ZONE 'UTC')::date::text
    );
    made := made + 1;
  END LOOP;
  RETURN made;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_notification_digest() FROM anon, authenticated;