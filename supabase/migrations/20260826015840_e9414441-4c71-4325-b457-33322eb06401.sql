-- 1. Per-day activity
CREATE TABLE public.activity_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  day date NOT NULL,
  minutes integer NOT NULL DEFAULT 0,
  sessions integer NOT NULL DEFAULT 0,
  screens jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT, INSERT, UPDATE ON public.activity_days TO authenticated;
GRANT ALL ON public.activity_days TO service_role;
ALTER TABLE public.activity_days ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own activity readable" ON public.activity_days
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read activity" ON public.activity_days
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "own activity writable" ON public.activity_days
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own activity updatable" ON public.activity_days
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX activity_days_day_idx ON public.activity_days (day DESC);

CREATE TRIGGER activity_days_updated_at BEFORE UPDATE ON public.activity_days
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Last login
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;

-- 3. Home questions
CREATE TABLE public.home_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  helper text,
  answer_type text NOT NULL DEFAULT 'short_text',
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  audience_type text NOT NULL DEFAULT 'everyone',
  audience_value text,
  cadence text NOT NULL DEFAULT 'once',
  active_from date NOT NULL DEFAULT CURRENT_DATE,
  active_to date,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT home_questions_answer_type_check CHECK (answer_type IN ('choices','short_text','number','date')),
  CONSTRAINT home_questions_audience_check CHECK (audience_type IN ('everyone','workspace','tier')),
  CONSTRAINT home_questions_cadence_check CHECK (cadence IN ('once','weekly'))
);

GRANT SELECT ON public.home_questions TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.home_questions TO authenticated;
GRANT ALL ON public.home_questions TO service_role;
ALTER TABLE public.home_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "questions readable" ON public.home_questions
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "staff manage questions" ON public.home_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER home_questions_updated_at BEFORE UPDATE ON public.home_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Answers
CREATE TABLE public.home_question_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.home_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  answer text,
  skipped boolean NOT NULL DEFAULT false,
  period text NOT NULL DEFAULT 'once',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (question_id, user_id, period)
);

GRANT SELECT, INSERT, UPDATE ON public.home_question_answers TO authenticated;
GRANT ALL ON public.home_question_answers TO service_role;
ALTER TABLE public.home_question_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own answers readable" ON public.home_question_answers
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "staff read answers" ON public.home_question_answers
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "own answers insertable" ON public.home_question_answers
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "own answers updatable" ON public.home_question_answers
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER home_question_answers_updated_at BEFORE UPDATE ON public.home_question_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Activity heartbeat
CREATE OR REPLACE FUNCTION public.record_activity_ping(_minutes integer DEFAULT 1, _screen text DEFAULT 'other')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
  v_day date;
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  SELECT coalesce(timezone, 'UTC') INTO v_tz FROM public.profiles WHERE user_id = auth.uid();
  v_day := (now() AT TIME ZONE coalesce(v_tz, 'UTC'))::date;

  INSERT INTO public.activity_days (user_id, day, minutes, sessions, screens)
  VALUES (auth.uid(), v_day, greatest(coalesce(_minutes, 1), 0), 1,
          jsonb_build_object(coalesce(_screen, 'other'), 1))
  ON CONFLICT (user_id, day) DO UPDATE
    SET minutes = public.activity_days.minutes + greatest(coalesce(_minutes, 1), 0),
        screens = public.activity_days.screens
          || jsonb_build_object(
               coalesce(_screen, 'other'),
               coalesce((public.activity_days.screens ->> coalesce(_screen, 'other'))::int, 0) + 1),
        updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.record_activity_ping(integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_activity_ping(integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.touch_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.profiles SET last_login_at = now() WHERE user_id = auth.uid();
  INSERT INTO public.activity_days (user_id, day, sessions)
  VALUES (auth.uid(), CURRENT_DATE, 1)
  ON CONFLICT (user_id, day) DO UPDATE
    SET sessions = public.activity_days.sessions + 1, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.touch_last_login() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.touch_last_login() TO authenticated;

-- 6. Who may view a person profile
CREATE OR REPLACE FUNCTION public.can_view_person(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
BEGIN
  IF v_me IS NULL THEN RETURN 'none'; END IF;
  IF public.has_role(v_me, 'owner') OR public.has_role(v_me, 'admin') THEN RETURN 'staff'; END IF;
  IF v_me = _user_id THEN RETURN 'self'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _user_id AND manager_id = v_me) THEN RETURN 'manager'; END IF;
  IF EXISTS (SELECT 1 FROM public.downline_edges WHERE descendant_id = _user_id AND ancestor_id = v_me) THEN RETURN 'manager'; END IF;
  RETURN 'none';
END;
$$;

REVOKE ALL ON FUNCTION public.can_view_person(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_person(uuid) TO authenticated;

-- 7. The person profile
CREATE OR REPLACE FUNCTION public.get_person_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_scope text := public.can_view_person(_user_id);
  v_staff boolean;
  v_out jsonb;
  v_tz text;
BEGIN
  IF v_scope = 'none' THEN
    RAISE EXCEPTION 'Not allowed to view this person';
  END IF;
  v_staff := v_scope = 'staff';

  SELECT coalesce(timezone, 'UTC') INTO v_tz FROM public.profiles WHERE user_id = _user_id;

  SELECT jsonb_build_object(
    'scope', v_scope,
    'header', (
      SELECT jsonb_build_object(
        'user_id', p.user_id,
        'full_name', p.full_name,
        'nickname', p.nickname,
        'avatar_url', p.avatar_url,
        'phone', p.phone,
        'email', p.email,
        'manager', p.direct_manager,
        'manager_id', p.manager_id,
        'team', t.name,
        'office', p.office_name,
        'status', p.status::text,
        'archived', p.archived,
        'alumni', p.alumni,
        'rank_label', (SELECT r.name FROM public.ranks r WHERE r.id = p.rank_id),
        'active_vertical', p.active_vertical,
        'role', (SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = p.user_id ORDER BY ur.role LIMIT 1),
        'can_recruit', p.can_recruit
      )
      FROM public.profiles p
      LEFT JOIN public.teams t ON t.id = p.team_id
      WHERE p.user_id = _user_id
    ),
    'workspaces', coalesce((
      SELECT jsonb_agg(jsonb_build_object('vertical', e.vertical, 'status', e.status, 'activated_at', e.activated_at) ORDER BY e.vertical)
      FROM public.rep_vertical_enrollments e WHERE e.user_id = _user_id
    ), '[]'::jsonb),
    'engagement', (
      SELECT jsonb_build_object(
        'last_login_at', (SELECT last_login_at FROM public.profiles WHERE user_id = _user_id),
        'last_active_at', (SELECT last_active_at FROM public.profiles WHERE user_id = _user_id),
        'minutes_today', coalesce((SELECT minutes FROM public.activity_days WHERE user_id = _user_id AND day = (now() AT TIME ZONE v_tz)::date), 0),
        'avg_minutes_14d', coalesce((SELECT round(avg(minutes))::int FROM public.activity_days WHERE user_id = _user_id AND day >= CURRENT_DATE - 13), 0),
        'days_active_30d', coalesce((SELECT count(*) FROM public.activity_days WHERE user_id = _user_id AND day >= CURRENT_DATE - 29 AND minutes > 0), 0),
        'tracking_started', (SELECT min(day) FROM public.activity_days WHERE user_id = _user_id),
        'streak', coalesce((SELECT current_streak FROM public.daily_login_streaks WHERE user_id = _user_id), 0),
        'lessons_done', (SELECT count(*) FROM public.lesson_progress lp WHERE lp.user_id = _user_id AND lp.completed_at IS NOT NULL),
        'lessons_total', (SELECT count(*) FROM public.training_lessons WHERE is_active),
        'last_lesson', (SELECT l.title FROM public.lesson_progress lp JOIN public.training_lessons l ON l.id = lp.lesson_id
                        WHERE lp.user_id = _user_id AND lp.completed_at IS NOT NULL ORDER BY lp.completed_at DESC LIMIT 1),
        'chat_messages_30d', (SELECT count(*) FROM public.chat_messages WHERE user_id = _user_id AND created_at >= now() - interval '30 days'),
        'events_attended', (SELECT count(*) FROM public.calendar_attendance WHERE user_id = _user_id AND present IS TRUE)
      )
    ),
    'activity_days', coalesce((
      SELECT jsonb_agg(jsonb_build_object('day', day, 'minutes', minutes, 'sessions', sessions) ORDER BY day DESC)
      FROM public.activity_days WHERE user_id = _user_id AND day >= CURRENT_DATE - 29
    ), '[]'::jsonb),
    'forms', (
      SELECT coalesce(jsonb_agg(f ORDER BY (f->>'at') DESC), '[]'::jsonb) FROM (
        SELECT jsonb_build_object('form', 'Public application', 'at', a.created_at,
          'answers', jsonb_build_object('Industry', a.vertical, 'City / state', a.city_state, 'Experience', a.years_experience,
            'Previous company', a.previous_company, 'How they found us', a.referral_source, 'Status', a.status)) AS f
        FROM public.applications a WHERE a.user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Workspace application — ' || va.vertical, 'at', va.created_at,
          'answers', va.answers) FROM public.vertical_applications va WHERE va.user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Winter plan', 'at', wp.created_at,
          'answers', jsonb_build_object('Season', wp.season_year, 'Plan', wp.answer)) FROM public.winter_plans wp WHERE wp.user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', hq.question, 'at', ha.created_at,
          'answers', jsonb_build_object('Answer', CASE WHEN ha.skipped THEN 'Skipped' ELSE ha.answer END))
        FROM public.home_question_answers ha JOIN public.home_questions hq ON hq.id = ha.question_id WHERE ha.user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Commitment interview', 'at', ci.created_at,
          'answers', jsonb_build_object('Why here', ci.why_here, 'Next year', ci.next_year_intent, 'Better next year', ci.better_next_year))
        FROM public.commitment_interviews ci WHERE ci.rep_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Weekly 1:1 (rep)', 'at', wr.submitted_at,
          'answers', jsonb_build_object('Week', wr.week_description, 'Big win', wr.big_win, 'Upcoming', wr.upcoming_activities,
            'Pitch work needed', wr.pitch_work_needed, 'Mission', wr.weekly_mission))
        FROM public.weekly_one_on_ones_rookie wr WHERE wr.rookie_user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Weekly 1:1 (manager)', 'at', wm.submitted_at,
          'answers', jsonb_build_object('Team', wm.team, 'Obstacles', wm.obstacles_encountered, 'Mission', wm.weekly_mission,
            'Recruit goal', wm.recruit_goal, 'Improvement', wm.manager_improvement))
        FROM public.weekly_one_on_ones_manager wm WHERE wm.manager_user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Weekly manager meeting', 'at', mm.created_at, 'answers', mm.data)
        FROM public.manager_meeting_submissions mm WHERE mm.user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Pitch submission', 'at', pa.submitted_at,
          'answers', jsonb_build_object('Status', pa.status, 'Attempt', pa.attempt_number, 'Feedback', pa.manager_feedback))
        FROM public.pitch_approval_requests pa WHERE pa.user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Feedback', 'at', fb.created_at,
          'answers', jsonb_build_object('Type', fb.feedback_type, 'Message', fb.message)) FROM public.app_feedback fb WHERE fb.user_id = _user_id
        UNION ALL
        SELECT jsonb_build_object('form', 'Reactivation request', 'at', rr.created_at,
          'answers', jsonb_build_object('Industry', rr.vertical, 'Worked under', rr.worked_under, 'Notes', rr.notes, 'Status', rr.status))
        FROM public.reactivation_requests rr WHERE rr.user_id = _user_id
      ) s(f)
    ),
    'production', jsonb_build_object(
      'revenue_months', coalesce((SELECT jsonb_agg(jsonb_build_object('month', month, 'revenue', revenue) ORDER BY month DESC)
        FROM public.rep_revenue WHERE user_id = _user_id), '[]'::jsonb),
      'installs_weeks', coalesce((SELECT jsonb_agg(jsonb_build_object('week_start', week_start, 'installs', installs, 'cancels', cancels) ORDER BY week_start DESC)
        FROM public.fiber_installs WHERE user_id = _user_id), '[]'::jsonb)
    ),
    'lead', (
      SELECT jsonb_build_object(
        'id', pl.id, 'stage', pl.stage, 'designation_status', pl.designation_status,
        'designated_to', pl.designated_to, 'next_call_at', pl.next_call_at,
        'last_contact_at', pl.last_contact_at, 'call_count', pl.call_count, 'do_not_call', pl.do_not_call,
        'activities', coalesce((SELECT jsonb_agg(jsonb_build_object('at', la.created_at, 'kind', la.kind, 'outcome', la.outcome, 'body', la.body) ORDER BY la.created_at DESC)
          FROM public.lead_activities la WHERE la.lead_id = pl.id), '[]'::jsonb),
        'private_notes', CASE WHEN v_staff THEN coalesce((SELECT jsonb_agg(jsonb_build_object('at', pn.created_at, 'kind', pn.kind, 'body', pn.body) ORDER BY pn.created_at DESC)
          FROM public.lead_private_notes pn WHERE pn.lead_id = pl.id), '[]'::jsonb) ELSE NULL END
      )
      FROM public.people_leads pl WHERE pl.profile_id = _user_id LIMIT 1
    ),
    'season_history', CASE WHEN v_staff THEN (
      SELECT jsonb_build_object(
        'showed_up_date', p.showed_up_date, 'departure_type', p.departure_type, 'departure_reason', p.departure_reason,
        'last_day_worked', p.last_day_worked, 'committed_last_day', p.committed_last_day,
        'next_year_status', p.next_year_status, 'next_year_notes', p.next_year_notes,
        'last_sweep_at', p.last_sweep_at, 'rep_year', p.rep_year, 'status_detail', p.status_detail
      ) FROM public.profiles p WHERE p.user_id = _user_id
    ) ELSE NULL END
  ) INTO v_out;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.get_person_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_person_profile(uuid) TO authenticated;

-- 8. Home question for the signed-in person
CREATE OR REPLACE FUNCTION public.get_open_home_question()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_me uuid := auth.uid();
  v_vertical text;
  v_role text;
  v_q record;
  v_period text;
BEGIN
  IF v_me IS NULL THEN RETURN NULL; END IF;
  SELECT active_vertical INTO v_vertical FROM public.profiles WHERE user_id = v_me;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = v_me ORDER BY role LIMIT 1;

  FOR v_q IN
    SELECT * FROM public.home_questions
    WHERE is_active
      AND active_from <= CURRENT_DATE
      AND (active_to IS NULL OR active_to >= CURRENT_DATE)
      AND (audience_type = 'everyone'
           OR (audience_type = 'workspace' AND audience_value = v_vertical)
           OR (audience_type = 'tier' AND audience_value = coalesce(v_role, 'rookie')))
    ORDER BY display_order, created_at
  LOOP
    v_period := CASE WHEN v_q.cadence = 'weekly'
      THEN to_char(date_trunc('week', CURRENT_DATE), 'YYYY-MM-DD') ELSE 'once' END;
    IF NOT EXISTS (
      SELECT 1 FROM public.home_question_answers
      WHERE question_id = v_q.id AND user_id = v_me AND period = v_period
    ) THEN
      RETURN jsonb_build_object(
        'id', v_q.id, 'question', v_q.question, 'helper', v_q.helper,
        'answer_type', v_q.answer_type, 'choices', v_q.choices, 'period', v_period);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_open_home_question() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_open_home_question() TO authenticated;

CREATE OR REPLACE FUNCTION public.answer_home_question(_question_id uuid, _answer text, _period text, _skip boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  INSERT INTO public.home_question_answers (question_id, user_id, answer, skipped, period)
  VALUES (_question_id, auth.uid(), _answer, coalesce(_skip, false), coalesce(_period, 'once'))
  ON CONFLICT (question_id, user_id, period) DO UPDATE
    SET answer = excluded.answer, skipped = excluded.skipped, updated_at = now();
END;
$$;

REVOKE ALL ON FUNCTION public.answer_home_question(uuid, text, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.answer_home_question(uuid, text, text, boolean) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_question_summary(_question_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  RETURN coalesce((
    SELECT jsonb_agg(x ORDER BY (x->>'count')::int DESC) FROM (
      SELECT jsonb_build_object(
        'answer', CASE WHEN ha.skipped THEN 'Skipped' ELSE coalesce(ha.answer, '') END,
        'count', count(*),
        'people', jsonb_agg(jsonb_build_object('user_id', ha.user_id, 'name', p.full_name) ORDER BY p.full_name)
      )
      FROM public.home_question_answers ha
      LEFT JOIN public.profiles p ON p.user_id = ha.user_id
      WHERE ha.question_id = _question_id
      GROUP BY CASE WHEN ha.skipped THEN 'Skipped' ELSE coalesce(ha.answer, '') END, ha.skipped
    ) s(x)
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.get_question_summary(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_question_summary(uuid) TO authenticated;

-- 9. The existing winter plan becomes the first question
INSERT INTO public.home_questions (question, helper, answer_type, choices, audience_type, cadence, display_order)
VALUES (
  'What is your plan for the winter?',
  'Answer once. It helps with planning for next season.',
  'choices',
  '["Selling", "School", "Working another job", "Taking time off", "Not sure yet"]'::jsonb,
  'everyone',
  'once',
  0
);