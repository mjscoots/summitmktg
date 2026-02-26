
-- Server-side quiz leaderboard function (bypasses RLS on lesson_progress)
CREATE OR REPLACE FUNCTION public.get_quiz_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  nickname text,
  avatar_url text,
  avg_score integer,
  quizzes_passed integer,
  total_attempts integer
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH rookies AS (
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'rookie'
  ),
  active_profiles AS (
    SELECT p.user_id, p.full_name, p.nickname, p.avatar_url
    FROM profiles p
    JOIN rookies r ON p.user_id = r.user_id
    WHERE p.status <> 'nlc'
  ),
  quiz_stats AS (
    SELECT
      lp.user_id,
      AVG(lp.quiz_score)::integer as avg_score,
      COUNT(*) FILTER (WHERE lp.quiz_passed = true)::integer as quizzes_passed,
      SUM(COALESCE(lp.quiz_attempts, 0))::integer as total_attempts
    FROM lesson_progress lp
    JOIN rookies r ON lp.user_id = r.user_id
    WHERE lp.quiz_score IS NOT NULL
    GROUP BY lp.user_id
  )
  SELECT
    ap.user_id,
    ap.full_name,
    ap.nickname,
    ap.avatar_url,
    qs.avg_score,
    qs.quizzes_passed,
    qs.total_attempts
  FROM active_profiles ap
  JOIN quiz_stats qs ON ap.user_id = qs.user_id
  ORDER BY qs.avg_score DESC, qs.quizzes_passed DESC
  LIMIT _limit;
END;
$$;

-- Server-side training leaderboard for dashboard panel (all-time, not weekly)
CREATE OR REPLACE FUNCTION public.get_training_leaderboard_panel(_limit integer DEFAULT 20)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  nickname text,
  completed_count integer,
  total_count integer,
  global_percent integer,
  badges text[]
)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_items integer;
BEGIN
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
  WITH rookies AS (
    SELECT ur.user_id FROM user_roles ur WHERE ur.role = 'rookie'
  ),
  active_profiles AS (
    SELECT p.user_id, p.full_name, p.nickname
    FROM profiles p
    JOIN rookies r ON p.user_id = r.user_id
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
  lesson_counts AS (
    SELECT lp.user_id, COUNT(DISTINCT lp.lesson_id)::integer as cnt
    FROM lesson_progress lp
    JOIN required_lessons rl ON lp.lesson_id = rl.lesson_id
    JOIN rookies r ON lp.user_id = r.user_id
    WHERE lp.completed_at IS NOT NULL
    GROUP BY lp.user_id
  ),
  video_counts AS (
    SELECT vp.user_id, COUNT(DISTINCT vp.video_id)::integer as cnt
    FROM video_progress vp
    JOIN required_videos rv ON vp.video_id = rv.video_id
    JOIN rookies r ON vp.user_id = r.user_id
    WHERE vp.watched = true
    GROUP BY vp.user_id
  ),
  user_badges AS (
    SELECT uta.user_id, array_agg(uta.badge_type) as badges
    FROM user_training_achievements uta
    JOIN rookies r ON uta.user_id = r.user_id
    WHERE uta.badge_type IN ('bronze', 'silver', 'gold', 'summit')
    GROUP BY uta.user_id
  )
  SELECT
    ap.user_id,
    ap.full_name,
    ap.nickname,
    (COALESCE(lc.cnt, 0) + COALESCE(vc.cnt, 0))::integer as completed_count,
    total_items as total_count,
    ROUND((COALESCE(lc.cnt, 0) + COALESCE(vc.cnt, 0))::numeric / total_items * 100)::integer as global_percent,
    COALESCE(ub.badges, ARRAY[]::text[]) as badges
  FROM active_profiles ap
  LEFT JOIN lesson_counts lc ON ap.user_id = lc.user_id
  LEFT JOIN video_counts vc ON ap.user_id = vc.user_id
  LEFT JOIN user_badges ub ON ap.user_id = ub.user_id
  ORDER BY (COALESCE(lc.cnt, 0) + COALESCE(vc.cnt, 0)) DESC
  LIMIT _limit;
END;
$$;
