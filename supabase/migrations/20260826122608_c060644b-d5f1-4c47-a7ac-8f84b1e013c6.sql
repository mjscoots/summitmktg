ALTER TABLE public.people_leads
  ADD COLUMN IF NOT EXISTS profile_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS ai_summary text;

CREATE OR REPLACE FUNCTION public.build_lead_snapshot(_profile_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _p record;
  _ai jsonb := NULL;
  _eng jsonb;
  _answers jsonb;
BEGIN
  SELECT * INTO _p FROM public.profiles WHERE id = _profile_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT jsonb_build_object(
           'summary', r.summary,
           'strengths', r.strengths,
           'concerns', r.concerns,
           'goals', r.goals,
           'last_built_at', r.last_built_at
         )
    INTO _ai
    FROM public.rep_ai_profiles r
   WHERE r.user_id = _p.user_id;

  SELECT jsonb_build_object(
           'app_minutes_30d', COALESCE(SUM(d.app_minutes), 0),
           'training_minutes_30d', COALESCE(SUM(d.training_minutes), 0),
           'days_active_30d', COUNT(*)
         )
    INTO _eng
    FROM public.daily_training_time d
   WHERE d.user_id = _p.user_id
     AND d.date >= (now() AT TIME ZONE public.company_timezone())::date - 30;

  _eng := COALESCE(_eng, jsonb_build_object('app_minutes_30d', 0, 'training_minutes_30d', 0, 'days_active_30d', 0));

  _eng := _eng
    || jsonb_build_object(
         'current_streak', (SELECT s.current_streak FROM public.daily_login_streaks s WHERE s.user_id = _p.user_id),
         'longest_streak', (SELECT s.longest_streak FROM public.daily_login_streaks s WHERE s.user_id = _p.user_id),
         'total_days_active', (SELECT s.total_days_active FROM public.daily_login_streaks s WHERE s.user_id = _p.user_id),
         'lessons_completed', (SELECT COUNT(*)::int FROM public.lesson_progress lp
                                WHERE lp.user_id = _p.user_id AND lp.completed_at IS NOT NULL)
       );

  SELECT COALESCE(jsonb_agg(row ORDER BY (row->>'event_date') DESC), '[]'::jsonb)
    INTO _answers
    FROM (
      SELECT jsonb_build_object(
               'event_title', e.title,
               'event_date', e.event_date,
               'answers', ca.answers
             ) AS row
      FROM public.calendar_attendance ca
      JOIN public.calendar_events e ON e.id = ca.event_id
      WHERE ca.user_id = _p.user_id
        AND ca.answers IS NOT NULL
        AND ca.answers::text NOT IN ('{}', 'null', '[]')
      ORDER BY e.event_date DESC
      LIMIT 5
    ) q;

  RETURN jsonb_build_object(
    'captured_at', now(),
    'profile_id', _p.id,
    'user_id', _p.user_id,
    'full_name', _p.full_name,
    'ai_profile', _ai,
    'engagement', _eng,
    'event_answers', COALESCE(_answers, '[]'::jsonb),
    'departure', jsonb_build_object(
      'departure_type', _p.departure_type,
      'departure_reason', _p.departure_reason,
      'last_day_worked', _p.last_day_worked,
      'archived_at', _p.archived_at,
      'revenue_to_date', _p.revenue_to_date
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.build_lead_snapshot(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.build_lead_snapshot(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.build_lead_snapshot(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.open_lead_on_departure(_user_id uuid, _reason text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _p record; _mgr uuid; _mgr_name text; _snap jsonb;
BEGIN
  SELECT * INTO _p FROM public.profiles WHERE user_id = _user_id;
  IF NOT FOUND THEN RETURN; END IF;

  _mgr := _p.manager_id;
  IF _mgr IS NULL THEN _mgr := public.resolve_person_by_name(_p.direct_manager); END IF;
  SELECT full_name INTO _mgr_name FROM public.profiles WHERE user_id = _mgr;

  _snap := public.build_lead_snapshot(_p.id);

  INSERT INTO public.people_leads (profile_id, full_name, email, phone, source, roster_status,
                                   bucket, designated_to, designation_status, former_manager_name, notes,
                                   profile_snapshot, ai_summary)
  VALUES (_p.id, _p.full_name, _p.email, _p.phone, 'roster', 'not_on_roster',
          'lead', _mgr, CASE WHEN _mgr IS NULL THEN 'free' ELSE 'designated' END,
          coalesce(_mgr_name, _p.direct_manager), _reason,
          _snap, _snap #>> '{ai_profile,summary}')
  ON CONFLICT (profile_id) DO UPDATE
    SET bucket = 'lead',
        designated_to = COALESCE(public.people_leads.designated_to, EXCLUDED.designated_to),
        designation_status = CASE
          WHEN public.people_leads.designated_to IS NOT NULL THEN public.people_leads.designation_status
          WHEN EXCLUDED.designated_to IS NOT NULL THEN 'designated'
          ELSE 'free' END,
        stage = CASE WHEN public.people_leads.stage IN ('excluded','dead') THEN 'new'
                     ELSE public.people_leads.stage END,
        roster_status = 'not_on_roster',
        profile_snapshot = COALESCE(EXCLUDED.profile_snapshot, public.people_leads.profile_snapshot),
        ai_summary = COALESCE(EXCLUDED.ai_summary, public.people_leads.ai_summary),
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.lead_detail(_lead uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads; _out jsonb;
BEGIN
  IF _tier = 'sales' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _tier = 'manager' AND NOT (
      _l.designated_to = auth.uid() OR _l.claimed_by = auth.uid() OR _l.designation_status = 'free'
    ) THEN RAISE EXCEPTION 'Not permitted'; END IF;

  _out := jsonb_build_object(
    'lead', to_jsonb(_l) - 'sheet_row',
    'designated_to_name', (SELECT full_name FROM public.profiles WHERE user_id = _l.designated_to),
    'designated_has_access', (_l.designated_to IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles x WHERE x.user_id = _l.designated_to AND x.approved AND NOT x.archived)),
    'profile', (SELECT jsonb_build_object('id', p.id, 'user_id', p.user_id, 'full_name', p.full_name,
                        'approved', p.approved, 'archived', p.archived, 'status', p.status,
                        'revenue_to_date', p.revenue_to_date, 'last_sweep_at', p.last_sweep_at)
                FROM public.profiles p WHERE p.id = _l.profile_id),
    'activities', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                        'id', a.id, 'kind', a.kind, 'outcome', a.outcome, 'body', a.body,
                        'next_call_at', a.next_call_at, 'created_at', a.created_at,
                        'actor_name', (SELECT full_name FROM public.profiles WHERE user_id = a.actor_id))
                      ORDER BY a.created_at DESC)
                    FROM public.lead_activities a WHERE a.lead_id = _lead), '[]'::jsonb),
    'private_notes', CASE WHEN _tier IN ('admin','owner') THEN
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'body', n.body,
                    'created_at', n.created_at) ORDER BY n.created_at DESC)
                  FROM public.lead_private_notes n WHERE n.lead_id = _lead), '[]'::jsonb)
      ELSE NULL END
  );
  RETURN _out;
END;
$$;

REVOKE ALL ON FUNCTION public.lead_detail(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.lead_detail(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.open_lead_on_departure(uuid, text) FROM anon;