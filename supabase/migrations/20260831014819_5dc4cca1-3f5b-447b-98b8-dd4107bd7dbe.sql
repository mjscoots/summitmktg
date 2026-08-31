
-- Pass 144: one membership rule, mirroring get_my_workspaces exactly.
CREATE OR REPLACE FUNCTION public.is_vertical_member(_user uuid, _vertical text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user IS NULL OR _vertical IS NULL THEN false
    WHEN EXISTS (SELECT 1 FROM public.rep_vertical_enrollments e
                  WHERE e.user_id = _user AND e.vertical = _vertical)
      THEN (SELECT e.status IN ('approved','onboarding','active','paused')
              FROM public.rep_vertical_enrollments e
             WHERE e.user_id = _user AND e.vertical = _vertical)
    WHEN public.has_role(_user,'owner') OR public.has_role(_user,'admin') THEN true
    ELSE _vertical = 'Pest'
  END;
$$;

REVOKE EXECUTE ON FUNCTION public.is_vertical_member(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.is_vertical_member(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.is_vertical_member(uuid, text) TO authenticated;

-- Quiet reps radar, scoped to the active workspace.
CREATE OR REPLACE FUNCTION public.dark_rep_radar(_manager uuid DEFAULT NULL::uuid, _vertical text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _rows jsonb;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'staff', false);
  END IF;

  _staff := public.has_role(_uid, 'admin') OR public.has_role(_uid, 'owner');
  IF NOT _staff AND NOT public.is_manager_tier(_uid) THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'staff', false);
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.last_seen_at NULLS FIRST, t.full_name), '[]'::jsonb)
  INTO _rows
  FROM (
    SELECT p.user_id,
           p.full_name,
           p.avatar_url,
           mp.full_name AS manager_name,
           ls.last_seen_at,
           CASE WHEN ls.last_seen_at IS NULL THEN NULL
                ELSE GREATEST(0, (now()::date - ls.last_seen_at::date))
           END AS days_quiet
    FROM public.profiles p
    LEFT JOIN public.profiles mp ON mp.user_id = p.manager_id
    LEFT JOIN LATERAL (
      SELECT GREATEST(
        CASE WHEN (SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p.user_id) IS NULL
             THEN NULL ELSE p.last_active_at END,
        (SELECT u.last_sign_in_at FROM auth.users u WHERE u.id = p.user_id),
        (SELECT max(c.last_read_at) FROM public.chat_read_state c WHERE c.user_id = p.user_id),
        (SELECT max(v.watched_at) FROM public.video_watch_log v WHERE v.user_id = p.user_id),
        (SELECT max(la.created_at) FROM public.lead_activities la WHERE la.actor_id = p.user_id)
      ) AS last_seen_at
    ) ls ON true
    WHERE COALESCE(p.archived, false) = false
      AND COALESCE(p.status::text, '') <> 'nlc'
      AND p.user_id <> _uid
      AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
      AND (
        (_staff AND (_manager IS NULL OR p.manager_id = _manager))
        OR (NOT _staff AND (p.manager_id = _uid OR public.is_in_my_downline(p.user_id)))
      )
  ) t;

  RETURN jsonb_build_object('rows', _rows, 'staff', _staff);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.dark_rep_radar(uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.dark_rep_radar(uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.dark_rep_radar(uuid, text) TO authenticated;

-- Stacks board, scoped to the carrier's own workspace membership.
CREATE OR REPLACE FUNCTION public.manager_stack_board(_carrier_id uuid, _manager uuid DEFAULT NULL::uuid, _vertical text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _staff boolean;
  _rows jsonb;
  _cv text;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('rows', '[]'::jsonb); END IF;
  _staff := public.has_role(_uid,'admin') OR public.has_role(_uid,'owner');
  IF NOT _staff AND NOT public.is_manager_tier(_uid) THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb);
  END IF;

  SELECT c.vertical INTO _cv FROM public.carriers c WHERE c.id = _carrier_id;
  -- A carrier only ever belongs to one workspace; asking from another returns nothing.
  IF _vertical IS NOT NULL AND _cv IS DISTINCT FROM _vertical THEN
    RETURN jsonb_build_object('rows', '[]'::jsonb, 'staff', _staff);
  END IF;

  SELECT COALESCE(jsonb_agg(t ORDER BY t.full_name), '[]'::jsonb) INTO _rows
  FROM (
    SELECT p.user_id, p.full_name, p.avatar_url,
           COALESCE(rcr.rank_id, p.rank_id) AS rank_id,
           r.name AS rank_name,
           (rcr.rank_id IS NOT NULL) AS carrier_specific,
           rcr.note,
           CASE WHEN s.confirmed THEN s.value ELSE NULL END AS stack_value,
           s.unit AS stack_unit,
           mp.full_name AS manager_name
    FROM public.profiles p
    LEFT JOIN public.rep_carrier_ranks rcr
      ON rcr.user_id = p.user_id AND rcr.carrier_id = _carrier_id
    LEFT JOIN public.ranks r ON r.id = COALESCE(rcr.rank_id, p.rank_id)
    LEFT JOIN public.rank_stacks s
      ON s.rank_id = COALESCE(rcr.rank_id, p.rank_id)
     AND s.carrier_id = _carrier_id
     AND s.vertical = _cv
    LEFT JOIN public.profiles mp ON mp.user_id = p.manager_id
    WHERE COALESCE(p.archived,false) = false
      AND COALESCE(p.status::text,'') <> 'nlc'
      AND (_cv IS NULL OR public.is_vertical_member(p.user_id, _cv))
      AND (
        (_staff AND (_manager IS NULL OR p.manager_id = _manager))
        OR (NOT _staff AND (p.manager_id = _uid OR public.is_in_my_downline(p.user_id)))
      )
  ) t;

  RETURN jsonb_build_object('rows', _rows, 'staff', _staff);
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.manager_stack_board(uuid, uuid, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.manager_stack_board(uuid, uuid, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.manager_stack_board(uuid, uuid, text) TO authenticated;

-- Personal stacks card, one workspace at a time.
CREATE OR REPLACE FUNCTION public.my_stacks(_vertical text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_agg(t ORDER BY t.vertical, t.carrier_name), '[]'::jsonb)
  FROM (
    SELECT c.id AS carrier_id, c.name AS carrier_name, c.vertical,
           r.name AS rank_name,
           CASE WHEN s.confirmed THEN s.value ELSE NULL END AS stack_value,
           s.unit AS stack_unit
    FROM public.carriers c
    LEFT JOIN public.rep_carrier_ranks rcr
      ON rcr.carrier_id = c.id AND rcr.user_id = auth.uid()
    LEFT JOIN public.profiles p ON p.user_id = auth.uid()
    LEFT JOIN public.ranks r ON r.id = COALESCE(rcr.rank_id, p.rank_id)
    LEFT JOIN public.rank_stacks s
      ON s.rank_id = COALESCE(rcr.rank_id, p.rank_id)
     AND s.carrier_id = c.id AND s.vertical = c.vertical
    WHERE c.active = true AND auth.uid() IS NOT NULL
      AND (_vertical IS NULL OR c.vertical = _vertical)
      AND public.is_vertical_member(auth.uid(), c.vertical)
  ) t;
$function$;

REVOKE EXECUTE ON FUNCTION public.my_stacks(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.my_stacks(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_stacks(text) TO authenticated;
DROP FUNCTION IF EXISTS public.my_stacks();

-- One on one prep roster, scoped to the active workspace.
CREATE OR REPLACE FUNCTION public.prep_roster(_vertical text DEFAULT NULL::text)
RETURNS TABLE(user_id uuid, full_name text, avatar_url text, team_name text, role text, rep_year text, is_vet boolean, manager_user_id uuid, manager_name text, manager_team text, group_key text, group_label text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _me uuid := auth.uid();
  _all boolean;
BEGIN
  IF _me IS NULL THEN
    RETURN;
  END IF;

  _all := public.has_role(_me, 'admin') OR public.has_role(_me, 'owner');

  IF NOT _all AND NOT public.is_manager_tier(_me) THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH people AS (
    SELECT p.user_id, p.full_name, p.avatar_url, p.team_id, p.manager_id, p.rep_year
    FROM public.profiles p
    WHERE p.status = 'active'
      AND COALESCE(p.archived, false) = false
      AND p.user_id <> _me
      AND (_vertical IS NULL OR public.is_vertical_member(p.user_id, _vertical))
  ),
  scoped AS (
    SELECT pe.*
    FROM people pe
    WHERE _all
       OR pe.manager_id = _me
       OR EXISTS (
            SELECT 1 FROM public.downline_edges e
            WHERE e.parent_user_id = _me
              AND e.child_user_id = pe.user_id
              AND e.edge_type = 'manages'
          )
  )
  SELECT
    s.user_id,
    s.full_name,
    s.avatar_url,
    t.name::text AS team_name,
    COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = s.user_id ORDER BY ur.role LIMIT 1), 'rookie') AS role,
    s.rep_year::text,
    true AS is_vet,
    CASE WHEN m.user_id IS NOT NULL AND COALESCE(m.archived, false) = false THEN m.user_id END AS manager_user_id,
    m.full_name::text AS manager_name,
    mt.name::text AS manager_team,
    CASE
      WHEN m.user_id IS NULL OR COALESCE(m.archived, false) = true THEN 'unassigned'
      ELSE m.user_id::text
    END AS group_key,
    CASE
      WHEN m.user_id IS NULL OR COALESCE(m.archived, false) = true THEN 'Needs a manager'
      ELSE m.full_name::text
    END AS group_label
  FROM scoped s
  LEFT JOIN public.profiles m ON m.user_id = s.manager_id
  LEFT JOIN public.teams t ON t.id = s.team_id
  LEFT JOIN public.teams mt ON mt.id = m.team_id
  ORDER BY 12, 2;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.prep_roster(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.prep_roster(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.prep_roster(text) TO authenticated;
DROP FUNCTION IF EXISTS public.prep_roster();

-- Applicant names read properly in the stall notification.
CREATE OR REPLACE FUNCTION public.notify_stalled_applications()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _app record;
  _staff uuid;
  _key text;
  _days integer;
  _name text;
  _written integer := 0;
BEGIN
  FOR _app IN
    SELECT a.id, COALESCE(a.full_name, 'An applicant') AS full_name, a.created_at
    FROM public.applications a
    WHERE a.status = 'pending'
      AND a.created_at < now() - interval '48 hours'
    ORDER BY a.created_at
  LOOP
    _days := GREATEST(1, (now()::date - _app.created_at::date));
    _key := 'appstall:' || _app.id::text || ':' || now()::date::text;
    _name := initcap(_app.full_name);

    FOR _staff IN
      SELECT DISTINCT r.user_id
      FROM public.user_roles r
      WHERE r.role IN ('owner'::app_role, 'admin'::app_role)
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.notification_preferences np
        WHERE np.user_id = _staff AND np.announcements = false
      ) THEN
        CONTINUE;
      END IF;

      INSERT INTO public.user_notifications (user_id, title, message, link, source_key)
      VALUES (
        _staff,
        'Application still waiting',
        _name || ' has been waiting ' || _days || ' day' || CASE WHEN _days = 1 THEN '' ELSE 's' END || '.',
        '/app/admin?section=requests',
        _key
      )
      ON CONFLICT (user_id, source_key) WHERE source_key IS NOT NULL DO NOTHING;

      IF FOUND THEN
        _written := _written + 1;
      END IF;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object('written', _written);
END;
$function$;

-- Content tables can only carry a known workspace, or nothing (All Summit).
ALTER TABLE public.assistant_faq ADD CONSTRAINT assistant_faq_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.announcement_posts ADD CONSTRAINT announcement_posts_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.announcements ADD CONSTRAINT announcements_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.calendar_events ADD CONSTRAINT calendar_events_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.scripts ADD CONSTRAINT scripts_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.training_videos ADD CONSTRAINT training_videos_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.training_courses ADD CONSTRAINT training_courses_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.training_drills ADD CONSTRAINT training_drills_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.playbook_entries ADD CONSTRAINT playbook_entries_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.chat_channels ADD CONSTRAINT chat_channels_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.team_resources ADD CONSTRAINT team_resources_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.team_scripts ADD CONSTRAINT team_scripts_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
ALTER TABLE public.public_calc_chips ADD CONSTRAINT public_calc_chips_vertical_check CHECK (vertical IS NULL OR vertical IN ('Pest','Fiber','Life'));
