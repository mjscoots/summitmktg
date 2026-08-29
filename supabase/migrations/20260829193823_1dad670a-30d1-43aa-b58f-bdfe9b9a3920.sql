CREATE OR REPLACE FUNCTION public.my_home_numbers()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _pid uuid;
  _rep_year text;
  _signed boolean := false;
  _has_lead boolean := false;
  _revenue numeric := 0;
  _blitz int := 0;
  _tickets int := 0;
BEGIN
  IF _me IS NULL THEN
    RETURN jsonb_build_object();
  END IF;

  SELECT p.id, p.rep_year::text INTO _pid, _rep_year
  FROM public.profiles p WHERE p.user_id = _me;

  IF _pid IS NOT NULL THEN
    SELECT true, COALESCE(l.signed_2027, false), COALESCE(l.season_revenue, 0)
      INTO _has_lead, _signed, _revenue
    FROM public.people_leads l
    WHERE l.profile_id = _pid
    ORDER BY l.updated_at DESC NULLS LAST
    LIMIT 1;
  END IF;

  SELECT count(*)::int INTO _blitz
  FROM public.calendar_attendance a
  JOIN public.calendar_events e ON e.id = a.event_id
  WHERE a.user_id = _me
    AND a.rsvp_status = 'attending'
    AND e.event_kind = 'blitz';

  -- Supra tickets: only the 2026 class that re-signed for 2027 earns them.
  IF _signed AND _rep_year = '2026' THEN
    _tickets := 1 + _blitz;
  END IF;

  RETURN jsonb_build_object(
    'has_lead', COALESCE(_has_lead, false),
    'rep_year', _rep_year,
    'signed_2027', COALESCE(_signed, false),
    'season_revenue', COALESCE(_revenue, 0),
    'blitz_rsvps', _blitz,
    'supra_tickets', _tickets
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.my_home_numbers() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_home_numbers() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_home_numbers() TO authenticated;