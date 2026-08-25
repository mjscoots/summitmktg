-- BADGES
CREATE TABLE public.badge_definitions (
  key text PRIMARY KEY,
  name text NOT NULL,
  description text,
  kind text NOT NULL DEFAULT 'certification' CHECK (kind IN ('milestone','certification')),
  icon text NOT NULL DEFAULT 'award',
  sort_order int NOT NULL DEFAULT 100,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.badge_definitions TO authenticated;
GRANT ALL ON public.badge_definitions TO service_role;
ALTER TABLE public.badge_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "badge_defs_read" ON public.badge_definitions FOR SELECT TO authenticated USING (true);
CREATE POLICY "badge_defs_admin" ON public.badge_definitions FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));

CREATE TABLE public.user_badges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  badge_key text NOT NULL REFERENCES public.badge_definitions(key) ON DELETE CASCADE,
  granted_by uuid,
  granted_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_key)
);
CREATE INDEX idx_user_badges_user ON public.user_badges(user_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_badges TO authenticated;
GRANT ALL ON public.user_badges TO service_role;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_badges_read" ON public.user_badges FOR SELECT TO authenticated USING (true);
CREATE POLICY "user_badges_admin_write" ON public.user_badges FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner') OR has_role(auth.uid(),'manager'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner') OR has_role(auth.uid(),'manager'));

INSERT INTO public.badge_definitions (key,name,description,kind,icon,sort_order) VALUES
  ('first_sign','First Sign','Signed your first recruit','milestone','star',10),
  ('signs_10','10 Signs','Signed 10 recruits','milestone','users',20),
  ('signs_25','25 Signs','Signed 25 recruits','milestone','crown',30),
  ('streak_7','7-Day Streak','Logged in 7 days in a row','milestone','flame',40),
  ('streak_30','30-Day Streak','Logged in 30 days in a row','milestone','zap',50);

CREATE OR REPLACE FUNCTION public.sync_milestone_badges(_user_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_signs int; v_streak int;
BEGIN
  SELECT count(*)::int INTO v_signs FROM recruiting_leads
   WHERE status IN ('Signed','Returning') AND (claimed_by = _user_id OR sourced_by = _user_id);
  SELECT COALESCE(GREATEST(longest_streak, current_streak),0) INTO v_streak
   FROM daily_login_streaks WHERE user_id = _user_id;
  v_streak := COALESCE(v_streak,0);

  IF v_signs >= 1 THEN INSERT INTO user_badges(user_id,badge_key) VALUES (_user_id,'first_sign') ON CONFLICT DO NOTHING; END IF;
  IF v_signs >= 10 THEN INSERT INTO user_badges(user_id,badge_key) VALUES (_user_id,'signs_10') ON CONFLICT DO NOTHING; END IF;
  IF v_signs >= 25 THEN INSERT INTO user_badges(user_id,badge_key) VALUES (_user_id,'signs_25') ON CONFLICT DO NOTHING; END IF;
  IF v_streak >= 7 THEN INSERT INTO user_badges(user_id,badge_key) VALUES (_user_id,'streak_7') ON CONFLICT DO NOTHING; END IF;
  IF v_streak >= 30 THEN INSERT INTO user_badges(user_id,badge_key) VALUES (_user_id,'streak_30') ON CONFLICT DO NOTHING; END IF;
END; $$;
REVOKE EXECUTE ON FUNCTION public.sync_milestone_badges(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.trg_sync_badges_leads()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IN ('Signed','Returning') THEN
    IF NEW.claimed_by IS NOT NULL THEN PERFORM sync_milestone_badges(NEW.claimed_by); END IF;
    IF NEW.sourced_by IS NOT NULL AND NEW.sourced_by <> COALESCE(NEW.claimed_by,'00000000-0000-0000-0000-000000000000'::uuid) THEN
      PERFORM sync_milestone_badges(NEW.sourced_by); END IF;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER sync_badges_on_lead AFTER INSERT OR UPDATE OF status ON public.recruiting_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_badges_leads();

CREATE OR REPLACE FUNCTION public.trg_sync_badges_streak()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN PERFORM sync_milestone_badges(NEW.user_id); RETURN NEW; END; $$;
CREATE TRIGGER sync_badges_on_streak AFTER INSERT OR UPDATE OF current_streak, longest_streak ON public.daily_login_streaks
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_badges_streak();

DO $$ DECLARE r record; BEGIN
  FOR r IN SELECT id FROM profiles LOOP PERFORM sync_milestone_badges(r.id); END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.get_badges_for_users(_user_ids uuid[])
RETURNS TABLE(user_id uuid, badge_key text, name text, description text, kind text, icon text, sort_order int, granted_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT ub.user_id, bd.key, bd.name, bd.description, bd.kind, bd.icon, bd.sort_order, ub.granted_at
  FROM user_badges ub JOIN badge_definitions bd ON bd.key = ub.badge_key
  WHERE bd.active AND ub.user_id = ANY(_user_ids)
  ORDER BY bd.sort_order
$$;
REVOKE EXECUTE ON FUNCTION public.get_badges_for_users(uuid[]) FROM anon;

-- SEASONS
CREATE TABLE public.seasons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.seasons TO authenticated;
GRANT ALL ON public.seasons TO service_role;
ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;
CREATE POLICY "seasons_read" ON public.seasons FOR SELECT TO authenticated USING (true);
CREATE POLICY "seasons_admin" ON public.seasons FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));

CREATE TABLE public.season_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  metric text NOT NULL CHECK (metric IN ('points','signs')),
  rank int NOT NULL,
  value int NOT NULL DEFAULT 0,
  full_name text,
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (season_id, metric, rank)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.season_results TO authenticated;
GRANT ALL ON public.season_results TO service_role;
ALTER TABLE public.season_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "season_results_read" ON public.season_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "season_results_admin" ON public.season_results FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));

CREATE OR REPLACE FUNCTION public.get_current_season()
RETURNS TABLE(id uuid, name text, starts_on date, ends_on date, days_left int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.starts_on, s.ends_on, GREATEST((s.ends_on - CURRENT_DATE), 0)::int
  FROM seasons s
  WHERE s.is_active AND CURRENT_DATE BETWEEN s.starts_on AND s.ends_on
  ORDER BY s.starts_on DESC LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.get_current_season() FROM anon;

CREATE OR REPLACE FUNCTION public.finalize_season(_season_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s record;
BEGIN
  IF NOT (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'not authorized'; END IF;
  SELECT * INTO s FROM seasons WHERE id = _season_id;
  IF s IS NULL THEN RAISE EXCEPTION 'season not found'; END IF;
  DELETE FROM season_results WHERE season_id = _season_id;

  INSERT INTO season_results (season_id, user_id, metric, rank, value, full_name, avatar_url)
  SELECT _season_id, t.user_id, 'points', t.rn, t.val, p.full_name, p.avatar_url
  FROM (
    SELECT pe.user_id, SUM(pe.points)::int val,
      ROW_NUMBER() OVER (ORDER BY SUM(pe.points) DESC)::int rn
    FROM point_events pe
    WHERE pe.created_at::date BETWEEN s.starts_on AND s.ends_on
    GROUP BY pe.user_id
  ) t JOIN profiles p ON p.id = t.user_id
  WHERE t.rn <= 3;

  INSERT INTO season_results (season_id, user_id, metric, rank, value, full_name, avatar_url)
  SELECT _season_id, t.user_id, 'signs', t.rn, t.val, p.full_name, p.avatar_url
  FROM (
    SELECT COALESCE(rl.claimed_by, rl.sourced_by) AS user_id, count(*)::int val,
      ROW_NUMBER() OVER (ORDER BY count(*) DESC)::int rn
    FROM recruiting_leads rl
    WHERE rl.status IN ('Signed','Returning')
      AND COALESCE(rl.last_activity_at, rl.created_at)::date BETWEEN s.starts_on AND s.ends_on
      AND COALESCE(rl.claimed_by, rl.sourced_by) IS NOT NULL
    GROUP BY COALESCE(rl.claimed_by, rl.sourced_by)
  ) t JOIN profiles p ON p.id = t.user_id
  WHERE t.rn <= 3;

  UPDATE seasons SET is_active = false WHERE id = _season_id;
END; $$;
REVOKE EXECUTE ON FUNCTION public.finalize_season(uuid) FROM anon;

CREATE OR REPLACE FUNCTION public.get_hall_of_fame()
RETURNS TABLE(season_id uuid, season_name text, starts_on date, ends_on date, metric text, rank int, value int, user_id uuid, full_name text, avatar_url text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id, s.name, s.starts_on, s.ends_on, sr.metric, sr.rank, sr.value, sr.user_id, sr.full_name, sr.avatar_url
  FROM season_results sr JOIN seasons s ON s.id = sr.season_id
  ORDER BY s.ends_on DESC, sr.metric, sr.rank
$$;
REVOKE EXECUTE ON FUNCTION public.get_hall_of_fame() FROM anon;

-- INCENTIVES
CREATE TABLE public.incentives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  metric text NOT NULL CHECK (metric IN ('signs','points')),
  target int NOT NULL CHECK (target > 0),
  ends_on date,
  prize_note text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.incentives TO authenticated;
GRANT ALL ON public.incentives TO service_role;
ALTER TABLE public.incentives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "incentives_read" ON public.incentives FOR SELECT TO authenticated USING (true);
CREATE POLICY "incentives_admin" ON public.incentives FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));

CREATE OR REPLACE FUNCTION public.get_incentive_progress()
RETURNS TABLE(id uuid, name text, metric text, target int, ends_on date, prize_note text, my_value int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT i.id, i.name, i.metric, i.target, i.ends_on, i.prize_note,
    CASE WHEN i.metric = 'signs' THEN (
      SELECT count(*)::int FROM recruiting_leads rl
      WHERE rl.status IN ('Signed','Returning')
        AND (rl.claimed_by = auth.uid() OR rl.sourced_by = auth.uid())
        AND (i.ends_on IS NULL OR COALESCE(rl.last_activity_at, rl.created_at)::date <= i.ends_on)
    ) ELSE (
      SELECT COALESCE(SUM(pe.points),0)::int FROM point_events pe
      WHERE pe.user_id = auth.uid()
        AND (i.ends_on IS NULL OR pe.created_at::date <= i.ends_on)
    ) END
  FROM incentives i
  WHERE i.is_active AND (i.ends_on IS NULL OR i.ends_on >= CURRENT_DATE)
  ORDER BY i.created_at
$$;
REVOKE EXECUTE ON FUNCTION public.get_incentive_progress() FROM anon;

-- TEAM BATTLES
CREATE OR REPLACE FUNCTION public.get_team_battles()
RETURNS TABLE(team_id uuid, team_name text, member_count int, total_points int, rank bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  WITH ws AS (SELECT date_trunc('week', (now() AT TIME ZONE 'America/Los_Angeles'))::date AS d),
  pts AS (
    SELECT p.team_id, COUNT(DISTINCT p.id)::int AS members,
      COALESCE(SUM(pe.points),0)::int AS total
    FROM profiles p
    LEFT JOIN point_events pe ON pe.user_id = p.id AND pe.created_at >= (SELECT d FROM ws)
    WHERE p.team_id IS NOT NULL AND COALESCE(p.archived,false) = false
    GROUP BY p.team_id
  )
  SELECT t.id, t.name, pts.members, pts.total,
    ROW_NUMBER() OVER (ORDER BY pts.total DESC, t.name)
  FROM pts JOIN teams t ON t.id = pts.team_id
$$;
REVOKE EXECUTE ON FUNCTION public.get_team_battles() FROM anon;