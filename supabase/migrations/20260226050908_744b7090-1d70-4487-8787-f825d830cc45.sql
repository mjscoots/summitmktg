
-- ============================================================
-- PHASE 1: Fix get_user_role to include 'owner' priority
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id uuid)
 RETURNS app_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT role FROM public.user_roles
  WHERE user_id = _user_id
  ORDER BY CASE role 
    WHEN 'owner' THEN 0
    WHEN 'admin' THEN 1 
    WHEN 'manager' THEN 2 
    WHEN 'rookie' THEN 3 
  END
  LIMIT 1
$$;

-- ============================================================
-- PHASE 2: Server-side global leaderboard function
-- Bypasses RLS so all users see identical rankings
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_global_leaderboard(_view_role text DEFAULT 'rookie', _limit integer DEFAULT 20)
RETURNS TABLE(
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
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pst_now timestamp;
  pst_monday date;
  pst_monday_str text;
  week_monday_iso text;
  total_items integer;
BEGIN
  -- Calculate PST Monday for weekly boundaries
  pst_now := (NOW() AT TIME ZONE 'America/Los_Angeles');
  pst_monday := (date_trunc('week', pst_now))::date;
  pst_monday_str := to_char(pst_monday, 'YYYY-MM-DD');
  week_monday_iso := (pst_monday AT TIME ZONE 'America/Los_Angeles')::text;

  -- Count total required training items
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
  -- Get required lesson IDs
  required_lessons AS (
    SELECT tl.id as lesson_id
    FROM training_lessons tl
    JOIN training_modules tm ON tl.module_id = tm.id
    JOIN training_courses tc ON tm.course_id = tc.id
    WHERE tc.is_active = true AND tm.is_active = true
      AND (tc.target_role IS NULL OR tc.target_role = 'rookie')
  ),
  -- Get required video IDs
  required_videos AS (
    SELECT tv.id as video_id
    FROM training_videos tv
    WHERE tv.is_active = true AND tv.is_required = true
  ),
  -- Weekly lesson completions (only required lessons)
  weekly_lessons AS (
    SELECT lp.user_id, COUNT(DISTINCT lp.lesson_id)::integer as cnt,
           AVG(COALESCE(lp.quiz_score, CASE WHEN lp.quiz_passed THEN 100 ELSE NULL END))::integer as avg_score
    FROM lesson_progress lp
    JOIN required_lessons rl ON lp.lesson_id = rl.lesson_id
    JOIN role_users ru ON lp.user_id = ru.user_id
    WHERE lp.completed_at IS NOT NULL
      AND lp.completed_at >= week_monday_iso::timestamptz
    GROUP BY lp.user_id
  ),
  -- Weekly video completions (only required videos)
  weekly_videos AS (
    SELECT vp.user_id, COUNT(DISTINCT vp.video_id)::integer as cnt
    FROM video_progress vp
    JOIN required_videos rv ON vp.video_id = rv.video_id
    JOIN role_users ru ON vp.user_id = ru.user_id
    WHERE vp.watched = true
      AND vp.watched_at >= week_monday_iso::timestamptz
    GROUP BY vp.user_id
  ),
  -- Streaks
  streaks AS (
    SELECT dls.user_id, dls.current_streak
    FROM daily_login_streaks dls
    JOIN role_users ru ON dls.user_id = ru.user_id
  ),
  -- Combine scores
  scored AS (
    SELECT
      ap.user_id,
      ap.full_name,
      ap.nickname,
      ap.avatar_url,
      (COALESCE(wl.cnt, 0) + COALESCE(wv.cnt, 0))::integer as lessons_completed,
      total_items as total_lessons,
      COALESCE(s.current_streak, 0)::integer as streak_days,
      ROUND(
        CASE
          WHEN ap.week_start IS NULL OR ap.week_start::text < pst_monday_str THEN 0
          ELSE COALESCE(ap.time_this_week_minutes, 0)
        END / 60.0, 1
      ) as hours_this_week,
      COALESCE(wl.avg_score, 0)::integer as avg_quiz_score,
      -- Scoring: 100/lesson + 10/streak day + 5/hour + 3*avg_quiz
      (
        (COALESCE(wl.cnt, 0) + COALESCE(wv.cnt, 0)) * 100
        + COALESCE(s.current_streak, 0) * 10
        + ROUND(CASE WHEN ap.week_start IS NULL OR ap.week_start::text < pst_monday_str THEN 0
                     ELSE COALESCE(ap.time_this_week_minutes, 0) END / 60.0 * 5)
        + COALESCE(wl.avg_score, 0) * 3
      )::integer as total_points,
      ROUND((COALESCE(wl.cnt, 0) + COALESCE(wv.cnt, 0))::numeric / total_items * 100)::integer as progress_pct,
      CASE WHEN ap.last_active_at >= (NOW() - INTERVAL '24 hours') THEN true ELSE false END as is_active_today
    FROM active_profiles ap
    LEFT JOIN weekly_lessons wl ON ap.user_id = wl.user_id
    LEFT JOIN weekly_videos wv ON ap.user_id = wv.user_id
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

-- ============================================================
-- PHASE 3: Fix quiz_questions_safe view permissions
-- Grant SELECT to authenticated users so all users see quizzes
-- ============================================================
GRANT SELECT ON quiz_questions_safe TO authenticated;

-- ============================================================
-- PHASE 4: Fix has_role to recognize 'owner' as superset of admin
-- ============================================================
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND (
        role = _role
        OR (role = 'owner' AND _role IN ('admin', 'manager', 'rookie'))
      )
  )
$$;
