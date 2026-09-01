-- 1. Cap on blitz markets (writes already limited to admin/owner by existing policy)
ALTER TABLE public.blitz_markets
  ADD COLUMN IF NOT EXISTS cap integer;
ALTER TABLE public.blitz_markets
  DROP CONSTRAINT IF EXISTS blitz_markets_cap_positive;
ALTER TABLE public.blitz_markets
  ADD CONSTRAINT blitz_markets_cap_positive CHECK (cap IS NULL OR cap > 0);

-- 2. Cap carried onto the public blitz event
ALTER TABLE public.calendar_events
  ADD COLUMN IF NOT EXISTS capacity integer;
ALTER TABLE public.calendar_events
  DROP CONSTRAINT IF EXISTS calendar_events_capacity_positive;
ALTER TABLE public.calendar_events
  ADD CONSTRAINT calendar_events_capacity_positive CHECK (capacity IS NULL OR capacity > 0);

-- 3. Waitlist table
CREATE TABLE IF NOT EXISTS public.blitz_waitlist (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

GRANT SELECT, DELETE ON public.blitz_waitlist TO authenticated;
GRANT ALL ON public.blitz_waitlist TO service_role;

ALTER TABLE public.blitz_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own waitlist row readable" ON public.blitz_waitlist;
CREATE POLICY "Own waitlist row readable"
  ON public.blitz_waitlist FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Managers and above read waitlist" ON public.blitz_waitlist;
CREATE POLICY "Managers and above read waitlist"
  ON public.blitz_waitlist FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

DROP POLICY IF EXISTS "Leave own waitlist row" ON public.blitz_waitlist;
CREATE POLICY "Leave own waitlist row"
  ON public.blitz_waitlist FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS blitz_waitlist_event_order
  ON public.blitz_waitlist (event_id, created_at);

-- 4. Making a blitz official carries the cap
CREATE OR REPLACE FUNCTION public.make_blitz_official(p_market_id uuid, p_start date, p_end date, p_host text DEFAULT NULL::text, p_location text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_market public.blitz_markets;
  v_event_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT * INTO v_market FROM public.blitz_markets WHERE id = p_market_id;
  IF v_market.id IS NULL THEN
    RAISE EXCEPTION 'market not found';
  END IF;
  IF v_market.status = 'official' THEN
    RAISE EXCEPTION 'already official';
  END IF;
  IF p_end < p_start THEN
    RAISE EXCEPTION 'end before start';
  END IF;

  INSERT INTO public.calendar_events (
    title, description, event_date, end_date, location, event_kind,
    scope, is_team_wide, vertical, capacity, created_by
  ) VALUES (
    v_market.market || ' Blitz',
    NULLIF(btrim(coalesce(p_host, '')), ''),
    (p_start::timestamp + interval '15 hours') AT TIME ZONE 'UTC',
    (p_end::timestamp) AT TIME ZONE 'UTC',
    NULLIF(btrim(coalesce(p_location, '')), ''),
    'blitz',
    'everyone',
    true,
    'Pest',
    v_market.cap,
    auth.uid()
  )
  RETURNING id INTO v_event_id;

  UPDATE public.blitz_markets
  SET status = 'official',
      official_event_id = v_event_id,
      window_start = p_start,
      window_end = p_end
  WHERE id = p_market_id;

  RETURN v_event_id;
END;
$function$;

-- 5. Promotion routine: fill open capped spots from the waitlist, in join order
CREATE OR REPLACE FUNCTION public.promote_blitz_waitlist(p_event_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_cap integer;
  v_going integer;
  v_next public.blitz_waitlist;
  v_promoted integer := 0;
  v_wants boolean;
  v_title text;
BEGIN
  SELECT capacity, title INTO v_cap, v_title
    FROM public.calendar_events WHERE id = p_event_id FOR UPDATE;
  IF v_cap IS NULL THEN RETURN 0; END IF;

  LOOP
    SELECT count(*)::int INTO v_going
      FROM public.calendar_attendance
     WHERE event_id = p_event_id AND status = 'attending';
    EXIT WHEN v_going >= v_cap;

    SELECT * INTO v_next
      FROM public.blitz_waitlist
     WHERE event_id = p_event_id
     ORDER BY created_at, id
     LIMIT 1
     FOR UPDATE;
    EXIT WHEN v_next.id IS NULL;

    INSERT INTO public.calendar_attendance (event_id, user_id, status, responded_at)
    VALUES (p_event_id, v_next.user_id, 'attending', now())
    ON CONFLICT (event_id, user_id) DO UPDATE
      SET status = 'attending', responded_at = now(), updated_at = now();

    DELETE FROM public.blitz_waitlist WHERE id = v_next.id;

    SELECT COALESCE(np.calendar_events, true) INTO v_wants
      FROM public.profiles p
      LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
     WHERE p.user_id = v_next.user_id;

    IF COALESCE(v_wants, true) THEN
      INSERT INTO public.user_notifications (user_id, title, message, link, event_id, source_key)
      VALUES (
        v_next.user_id,
        'A spot opened',
        'You are in for ' || COALESCE(v_title, 'the blitz') || '. Your waitlist spot became a seat.',
        '/app/events',
        p_event_id,
        'blitz_promo:' || p_event_id::text || ':' || v_next.user_id::text
      );
    END IF;

    v_promoted := v_promoted + 1;
  END LOOP;

  RETURN v_promoted;
END;
$function$;

-- 6. RSVP with cap enforcement at the database
CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid, p_status text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev record;
  v_prev text;
  v_going integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_status NOT IN ('attending','not_attending','maybe') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id FOR UPDATE;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Event not available';
  END IF;

  SELECT status INTO v_prev FROM public.calendar_attendance
   WHERE event_id = p_event_id AND user_id = auth.uid();

  IF ev.capacity IS NOT NULL AND p_status = 'attending' AND COALESCE(v_prev,'') <> 'attending' THEN
    SELECT count(*)::int INTO v_going FROM public.calendar_attendance
     WHERE event_id = p_event_id AND status = 'attending';
    IF v_going >= ev.capacity THEN RAISE EXCEPTION 'blitz_full'; END IF;
  END IF;

  INSERT INTO public.calendar_attendance (event_id, user_id, status, responded_at)
  VALUES (p_event_id, auth.uid(), p_status, now())
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = excluded.status, responded_at = now(), updated_at = now();

  IF p_status = 'attending' THEN
    DELETE FROM public.blitz_waitlist WHERE event_id = p_event_id AND user_id = auth.uid();
  END IF;

  IF ev.capacity IS NOT NULL AND v_prev = 'attending' AND p_status <> 'attending' THEN
    PERFORM public.promote_blitz_waitlist(p_event_id);
  END IF;
END $function$;

CREATE OR REPLACE FUNCTION public.rsvp_event(p_event_id uuid, p_status text, p_answers jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev record;
  v_prev text;
  v_going integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF p_status NOT IN ('attending','not_attending','maybe') THEN RAISE EXCEPTION 'Invalid status'; END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id FOR UPDATE;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Event not available';
  END IF;

  SELECT status INTO v_prev FROM public.calendar_attendance
   WHERE event_id = p_event_id AND user_id = auth.uid();

  IF ev.capacity IS NOT NULL AND p_status = 'attending' AND COALESCE(v_prev,'') <> 'attending' THEN
    SELECT count(*)::int INTO v_going FROM public.calendar_attendance
     WHERE event_id = p_event_id AND status = 'attending';
    IF v_going >= ev.capacity THEN RAISE EXCEPTION 'blitz_full'; END IF;
  END IF;

  INSERT INTO public.calendar_attendance (event_id, user_id, status, responded_at, answers)
  VALUES (p_event_id, auth.uid(), p_status, now(), p_answers)
  ON CONFLICT (event_id, user_id) DO UPDATE
    SET status = excluded.status, responded_at = now(),
        answers = COALESCE(excluded.answers, public.calendar_attendance.answers),
        updated_at = now();

  IF p_status = 'attending' THEN
    DELETE FROM public.blitz_waitlist WHERE event_id = p_event_id AND user_id = auth.uid();
  END IF;

  IF ev.capacity IS NOT NULL AND v_prev = 'attending' AND p_status <> 'attending' THEN
    PERFORM public.promote_blitz_waitlist(p_event_id);
  END IF;
END $function$;

-- 7. Waitlist join and leave
CREATE OR REPLACE FUNCTION public.join_blitz_waitlist(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev record;
  v_going integer;
  v_pos integer;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id FOR UPDATE;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, auth.uid()) THEN
    RAISE EXCEPTION 'Event not available';
  END IF;
  IF ev.capacity IS NULL THEN RAISE EXCEPTION 'no cap on this event'; END IF;

  SELECT count(*)::int INTO v_going FROM public.calendar_attendance
   WHERE event_id = p_event_id AND status = 'attending';

  IF v_going < ev.capacity THEN
    RETURN jsonb_build_object('joined', false, 'spots_left', ev.capacity - v_going);
  END IF;

  INSERT INTO public.blitz_waitlist (event_id, user_id)
  VALUES (p_event_id, auth.uid())
  ON CONFLICT (event_id, user_id) DO NOTHING;

  SELECT pos INTO v_pos FROM (
    SELECT w.user_id, row_number() OVER (ORDER BY w.created_at, w.id)::int AS pos
      FROM public.blitz_waitlist w WHERE w.event_id = p_event_id
  ) ranked WHERE ranked.user_id = auth.uid();

  RETURN jsonb_build_object('joined', true, 'position', v_pos);
END $function$;

CREATE OR REPLACE FUNCTION public.leave_blitz_waitlist(p_event_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  DELETE FROM public.blitz_waitlist WHERE event_id = p_event_id AND user_id = auth.uid();
  RETURN true;
END $function$;

-- 8. Live cap state for the card
CREATE OR REPLACE FUNCTION public.blitz_cap_state(p_event_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  ev record;
  v_uid uuid := auth.uid();
  v_going integer;
  v_staff boolean;
  v_pos integer;
  v_list jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  SELECT * INTO ev FROM public.calendar_events WHERE id = p_event_id;
  IF ev IS NULL OR NOT public.can_view_event(ev.scope, ev.team_id, v_uid) THEN
    RETURN jsonb_build_object('error','Event not available');
  END IF;
  IF ev.capacity IS NULL THEN RETURN jsonb_build_object('capacity', NULL); END IF;

  SELECT count(*)::int INTO v_going FROM public.calendar_attendance
   WHERE event_id = p_event_id AND status = 'attending';

  v_staff := public.has_role(v_uid,'manager') OR public.has_role(v_uid,'admin') OR public.has_role(v_uid,'owner');

  SELECT pos INTO v_pos FROM (
    SELECT w.user_id, row_number() OVER (ORDER BY w.created_at, w.id)::int AS pos
      FROM public.blitz_waitlist w WHERE w.event_id = p_event_id
  ) ranked WHERE ranked.user_id = v_uid;

  IF v_staff THEN
    SELECT COALESCE(jsonb_agg(jsonb_build_object('user_id', r.user_id, 'name', p.full_name, 'position', r.pos)
                              ORDER BY r.pos), '[]'::jsonb)
      INTO v_list
      FROM (
        SELECT w.user_id, row_number() OVER (ORDER BY w.created_at, w.id)::int AS pos
          FROM public.blitz_waitlist w WHERE w.event_id = p_event_id
      ) r
      LEFT JOIN public.profiles p ON p.user_id = r.user_id;
  END IF;

  RETURN jsonb_build_object(
    'capacity', ev.capacity,
    'going_count', v_going,
    'spots_left', GREATEST(ev.capacity - v_going, 0),
    'my_position', v_pos,
    'is_staff', COALESCE(v_staff,false),
    'waitlist', v_list
  );
END $function$;

-- 9. Cap edit from the planning board (admin and owner only)
CREATE OR REPLACE FUNCTION public.set_blitz_cap(p_market_id uuid, p_cap integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_event_id uuid;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;
  IF p_cap IS NOT NULL AND p_cap < 1 THEN RAISE EXCEPTION 'cap must be at least 1'; END IF;

  UPDATE public.blitz_markets SET cap = p_cap WHERE id = p_market_id
  RETURNING official_event_id INTO v_event_id;

  IF v_event_id IS NOT NULL THEN
    UPDATE public.calendar_events SET capacity = p_cap, updated_at = now() WHERE id = v_event_id;
    PERFORM public.promote_blitz_waitlist(v_event_id);
  END IF;

  RETURN true;
END $function$;

-- 10. Privileges
REVOKE EXECUTE ON FUNCTION public.promote_blitz_waitlist(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.join_blitz_waitlist(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.leave_blitz_waitlist(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.blitz_cap_state(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.set_blitz_cap(uuid, integer) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rsvp_event(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.rsvp_event(uuid, text, jsonb) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.make_blitz_official(uuid, date, date, text, text) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.join_blitz_waitlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_blitz_waitlist(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.blitz_cap_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_blitz_cap(uuid, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.rsvp_event(uuid, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.make_blitz_official(uuid, date, date, text, text) TO authenticated;