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
  v_email text;
  v_phone text;
BEGIN
  IF v_scope = 'none' THEN
    RAISE EXCEPTION 'Not allowed to view this person';
  END IF;
  v_staff := v_scope = 'staff';

  SELECT coalesce(timezone, 'UTC'), lower(coalesce(email, '')), regexp_replace(coalesce(phone, ''), '\D', '', 'g')
    INTO v_tz, v_email, v_phone
  FROM public.profiles WHERE user_id = _user_id;

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
        FROM public.applications a
        WHERE (v_email <> '' AND lower(coalesce(a.email, '')) = v_email)
           OR (v_phone <> '' AND regexp_replace(coalesce(a.phone, ''), '\D', '', 'g') = v_phone)
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