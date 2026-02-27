
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(
  _view_role text,
  _limit integer DEFAULT 20,
  _mode text DEFAULT 'weekly'
)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  nickname text,
  avatar_url text,
  lessons_completed integer,
  total_lessons integer,
  streak_days integer,
  hours_this_week numeric,
  avg_quiz_score integer,
  total_points integer,
  progress_pct integer,
  is_active_today boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pst_now timestamp;
  pst_monday date;
  pst_monday_str text;
  week_monday_iso text;
  total_items integer;
  is_overall boolean;
BEGIN
  is_overall := (_mode = 'overall');

  pst_now := (NOW() AT TIME ZONE 'America/Los_Angeles');
  pst_monday := (date_trunc('week', pst_now))::date;
  pst_monday_str := to_char(pst_monday, 'YYYY-MM-DD');
  week_monday_iso := (pst_monday AT TIME ZONE 'America/Los_Angeles')::text;

  SELECT COUNT(*) INTO total_items FROM (
    SELECT tl.id FROM training_lessons tl
    JOIN training_modules tm ON tl.module_id = tm.id
    JOIN training_courses tc ON tm.course_id = tc.id
    WHERE tc.is_active = true AND tm.is_active = true
      AND (tc.target_role IS NULL OR tc.target_role = 'rookie')
    UNION ALL
    SELECT tv.id FROM training_videos tv
    WHERE tv.is_active = true AND tv.is_required = true
  ) items;

  IF total_items = 0 THEN total_items := 1; END IF;

  RETURN QUERY
  WITH role_users AS (
    SELECT ur.user_id
    FROM user_roles ur
    WHERE ur.role = _view_role::app_role
  ),
  active_profiles AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url,
           p.time_this_week_minutes, p.week_start, p.is_active_now, p.last_active_at
    FROM profiles p
    JOIN role_users ru ON p.user_id = ru.user_id
    WHERE p.status <> 'nlc'
  ),
  required_lessons AS (
    SELECT tl.id as lesson_id
    FROM training_lessons tl
    JOIN training_modules tm ON tl.module_id = tm.id
    JOIN training_courses tc ON tm.course_id = tc.id
    WHERE tc.is_active = true AND tm.is_active = true
      AND (tc.target_role IS NULL OR tc.target_role = 'rookie')
  ),
  required_videos AS (
    SELECT tv.id as video_id
    FROM training_videos tv
    WHERE tv.is_active = true AND tv.is_required = true
  ),
  -- Lesson completions: all-time or weekly
  counted_lessons AS (
    SELECT lp.user_id, COUNT(DISTINCT lp.lesson_id)::integer as cnt,
           AVG(COALESCE(lp.quiz_score, CASE WHEN lp.quiz_passed THEN 100 ELSE NULL END))::integer as avg_score
    FROM lesson_progress lp
    JOIN required_lessons rl ON lp.lesson_id = rl.lesson_id
    JOIN role_users ru ON lp.user_id = ru.user_id
    WHERE lp.completed_at IS NOT NULL
      AND (is_overall OR lp.completed_at >= week_monday_iso::timestamptz)
    GROUP BY lp.user_id
  ),
  -- Video completions: all-time or weekly
  counted_videos AS (
    SELECT vp.user_id, COUNT(DISTINCT vp.video_id)::integer as cnt
    FROM video_progress vp
    JOIN required_videos rv ON vp.video_id = rv.video_id
    JOIN role_users ru ON vp.user_id = ru.user_id
    WHERE vp.watched = true
      AND (is_overall OR vp.watched_at >= week_monday_iso::timestamptz)
    GROUP BY vp.user_id
  ),
  -- All-time hours from daily_training_time
  alltime_hours AS (
    SELECT dtt.user_id, SUM(dtt.total_minutes)::numeric as total_mins
    FROM daily_training_time dtt
    JOIN role_users ru ON dtt.user_id = ru.user_id
    GROUP BY dtt.user_id
  ),
  streaks AS (
    SELECT dls.user_id, dls.current_streak
    FROM daily_login_streaks dls
    JOIN role_users ru ON dls.user_id = ru.user_id
  ),
  scored AS (
    SELECT
      ap.user_id,
      ap.full_name,
      ap.nickname,
      ap.avatar_url,
      (COALESCE(cl.cnt, 0) + COALESCE(cv.cnt, 0))::integer as lessons_completed,
      total_items as total_lessons,
      COALESCE(s.current_streak, 0)::integer as streak_days,
      CASE
        WHEN is_overall THEN ROUND(COALESCE(ah.total_mins, 0) / 60.0, 1)
        ELSE ROUND(
          CASE
            WHEN ap.week_start IS NULL OR ap.week_start::text < pst_monday_str THEN 0
            ELSE COALESCE(ap.time_this_week_minutes, 0)
          END / 60.0, 1)
      END as hours_this_week,
      COALESCE(cl.avg_score, 0)::integer as avg_quiz_score,
      -- Scoring
      (
        (COALESCE(cl.cnt, 0) + COALESCE(cv.cnt, 0)) * 100
        + COALESCE(s.current_streak, 0) * 10
        + ROUND(
            CASE
              WHEN is_overall THEN COALESCE(ah.total_mins, 0) / 60.0 * 50
              ELSE CASE WHEN ap.week_start IS NULL OR ap.week_start::text < pst_monday_str THEN 0
                        ELSE COALESCE(ap.time_this_week_minutes, 0) END / 60.0 * 50
            END
          )
        + COALESCE(cl.avg_score, 0) * 3
      )::integer as total_points,
      ROUND((COALESCE(cl.cnt, 0) + COALESCE(cv.cnt, 0))::numeric / total_items * 100)::integer as progress_pct,
      CASE WHEN ap.last_active_at >= (NOW() - INTERVAL '24 hours') THEN true ELSE false END as is_active_today
    FROM active_profiles ap
    LEFT JOIN counted_lessons cl ON ap.user_id = cl.user_id
    LEFT JOIN counted_videos cv ON ap.user_id = cv.user_id
    LEFT JOIN alltime_hours ah ON ap.user_id = ah.user_id
    LEFT JOIN streaks s ON ap.user_id = s.user_id
  )
  SELECT s.user_id, s.full_name, s.nickname, s.avatar_url,
         s.lessons_completed, s.total_lessons, s.streak_days,
         s.hours_this_week, s.avg_quiz_score, s.total_points,
         s.progress_pct, s.is_active_today
  FROM scored s
  WHERE s.total_points >= 100
  ORDER BY s.total_points DESC
  LIMIT _limit;
END;
$$;
