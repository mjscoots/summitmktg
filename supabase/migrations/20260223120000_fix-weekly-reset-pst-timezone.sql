-- Fix weekly reset bug: pin all date calculations to America/Los_Angeles (PST/PDT)
-- and ensure time_this_week_minutes resets properly on new week.

-- Helper: get current date in PST
-- PostgreSQL date_trunc('week', ...) returns Monday (ISO 8601)

-- ============================================================
-- 1. Fix record_daily_time — use PST for date and week boundary
-- ============================================================
CREATE OR REPLACE FUNCTION public.record_daily_time(_user_id UUID, _category TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pst_today date;
  pst_week_start date;
BEGIN
  -- All date calculations pinned to PST
  pst_today := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  pst_week_start := date_trunc('week', pst_today)::date;

  -- Upsert daily_training_time for today (PST)
  INSERT INTO daily_training_time (user_id, date, total_minutes,
    training_minutes, video_minutes, lesson_minutes)
  VALUES (
    _user_id,
    pst_today,
    1,
    CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END
  )
  ON CONFLICT (user_id, date)
  DO UPDATE SET
    total_minutes = daily_training_time.total_minutes + 1,
    training_minutes = daily_training_time.training_minutes + CASE WHEN _category = 'training' THEN 1 ELSE 0 END,
    video_minutes = daily_training_time.video_minutes + CASE WHEN _category = 'video' THEN 1 ELSE 0 END,
    lesson_minutes = daily_training_time.lesson_minutes + CASE WHEN _category = 'lesson' THEN 1 ELSE 0 END,
    updated_at = now();

  -- Update profiles.time_this_week_minutes (with PST week reset)
  UPDATE profiles
  SET
    time_this_week_minutes = CASE
      WHEN COALESCE(week_start, '1970-01-01'::date) < pst_week_start THEN 1
      ELSE COALESCE(time_this_week_minutes, 0) + 1
    END,
    week_start = CASE
      WHEN COALESCE(week_start, '1970-01-01'::date) < pst_week_start THEN pst_week_start
      ELSE week_start
    END
  WHERE user_id = _user_id;
END;
$$;

-- ============================================================
-- 2. Fix update_user_activity — use PST, AND reset time on new week
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_user_activity(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pst_week_start date;
BEGIN
  pst_week_start := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles')::date)::date;

  UPDATE profiles
  SET
    last_active_at = NOW(),
    is_active_now = true,
    -- Reset weekly time if new week detected
    time_this_week_minutes = CASE
      WHEN COALESCE(week_start, '1970-01-01'::date) < pst_week_start THEN 0
      ELSE time_this_week_minutes
    END,
    week_start = CASE
      WHEN COALESCE(week_start, '1970-01-01'::date) < pst_week_start THEN pst_week_start
      ELSE week_start
    END
  WHERE user_id = _user_id;
END;
$$;

-- ============================================================
-- 3. Fix get_pillar_team_members — return 0 for stale week data
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_pillar_team_members(_pillar_user_id uuid)
RETURNS TABLE(
  profile_id uuid,
  user_id uuid,
  full_name text,
  email text,
  avatar_url text,
  role app_role,
  direct_manager text,
  team_name text,
  status user_status,
  last_active_at timestamp with time zone,
  is_active_now boolean,
  time_this_week_minutes integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  pillar_name text;
  pillar_team_id uuid;
  pst_week_start date;
BEGIN
  pst_week_start := date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles')::date)::date;

  -- Get pillar info
  SELECT p.full_name, COALESCE(p.team_id, t.id)
  INTO pillar_name, pillar_team_id
  FROM profiles p
  LEFT JOIN teams t ON t.leader_id = p.user_id
  WHERE p.user_id = _pillar_user_id;

  -- Return all members from both team_id AND recursive downline
  RETURN QUERY
  WITH RECURSIVE downline AS (
    -- Direct reports
    SELECT p.user_id, 1 as depth
    FROM profiles p
    WHERE p.direct_manager = pillar_name
      AND p.status <> 'nlc'

    UNION ALL

    -- Recursive reports
    SELECT p.user_id, d.depth + 1
    FROM profiles p
    INNER JOIN downline d ON p.direct_manager = (
      SELECT pr.full_name FROM profiles pr WHERE pr.user_id = d.user_id
    )
    WHERE p.status <> 'nlc' AND d.depth < 10
  ),
  all_member_ids AS (
    -- Members from downline
    SELECT dl.user_id FROM downline dl
    UNION
    -- Members by team_id
    SELECT p.user_id
    FROM profiles p
    WHERE p.team_id = pillar_team_id
      AND p.status <> 'nlc'
      AND p.user_id != _pillar_user_id
  )
  SELECT
    p.id as profile_id,
    p.user_id,
    p.full_name,
    p.email,
    p.avatar_url,
    COALESCE(get_user_role(p.user_id), 'rookie') as role,
    p.direct_manager,
    t.name as team_name,
    p.status,
    p.last_active_at,
    p.is_active_now,
    -- Return 0 if user's week_start is stale (hasn't logged in this week)
    CASE
      WHEN COALESCE(p.week_start, '1970-01-01'::date) < pst_week_start THEN 0
      ELSE COALESCE(p.time_this_week_minutes, 0)
    END as time_this_week_minutes
  FROM profiles p
  LEFT JOIN teams t ON p.team_id = t.id
  INNER JOIN all_member_ids ami ON p.user_id = ami.user_id
  ORDER BY
    CASE COALESCE(get_user_role(p.user_id), 'rookie')
      WHEN 'admin' THEN 1
      WHEN 'manager' THEN 2
      WHEN 'rookie' THEN 3
    END,
    p.full_name;
END;
$$;

-- ============================================================
-- 4. One-time fix: reset stale users who still show last week's data
-- ============================================================
UPDATE profiles
SET
  time_this_week_minutes = 0,
  week_start = date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles')::date)::date
WHERE COALESCE(week_start, '1970-01-01'::date) < date_trunc('week', (NOW() AT TIME ZONE 'America/Los_Angeles')::date)::date;
