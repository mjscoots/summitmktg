CREATE TABLE IF NOT EXISTS public.winter_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  season_year int NOT NULL DEFAULT date_part('year', now())::int,
  answer text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, season_year)
);

GRANT SELECT, INSERT, UPDATE ON public.winter_plans TO authenticated;
GRANT ALL ON public.winter_plans TO service_role;

ALTER TABLE public.winter_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "winter_plans_own_read" ON public.winter_plans
  FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "winter_plans_own_write" ON public.winter_plans
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "winter_plans_own_update" ON public.winter_plans
  FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "winter_plans_staff_read" ON public.winter_plans
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));
CREATE POLICY "winter_plans_fiber_read" ON public.winter_plans
  FOR SELECT TO authenticated
  USING (answer = 'Fiber' AND public.is_president_of_vertical('Fiber'));

CREATE TRIGGER trg_winter_plans_updated_at
  BEFORE UPDATE ON public.winter_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A rep's own answer, plus whether the prompt is still open for them.
CREATE OR REPLACE FUNCTION public.get_my_winter_plan()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'season_year', date_part('year', now())::int,
    'answer', (SELECT answer FROM public.winter_plans
                WHERE user_id = auth.uid()
                  AND season_year = date_part('year', now())::int),
    'is_pest_member', EXISTS (
      SELECT 1 FROM public.rep_vertical_enrollments e
      WHERE e.user_id = auth.uid() AND e.vertical = 'Pest'
        AND e.status IN ('approved','onboarding','active','paused')
    )
  )
  WHERE auth.uid() IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.set_my_winter_plan(_answer text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not signed in');
  END IF;
  IF _answer NOT IN ('Fiber','Life','Off this winter','Not sure yet') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid answer');
  END IF;

  INSERT INTO public.winter_plans (user_id, answer)
  VALUES (auth.uid(), _answer)
  ON CONFLICT (user_id, season_year)
    DO UPDATE SET answer = excluded.answer, updated_at = now();

  IF _answer = 'Life' THEN
    INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status)
    VALUES (auth.uid(), 'Life', 'interested')
    ON CONFLICT (user_id, vertical) DO NOTHING;
  END IF;

  RETURN jsonb_build_object('success', true, 'answer', _answer);
END;
$$;

-- Owner/admin: counts by answer with the names behind each.
CREATE OR REPLACE FUNCTION public.get_winter_plan_summary()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'season_year', date_part('year', now())::int,
    'answered', (SELECT count(*) FROM public.winter_plans w
                  WHERE w.season_year = date_part('year', now())::int),
    'by_answer', COALESCE((
      SELECT jsonb_agg(x ORDER BY x->>'answer')
      FROM (
        SELECT jsonb_build_object(
                 'answer', w.answer,
                 'count', count(*),
                 'people', jsonb_agg(jsonb_build_object('user_id', w.user_id,
                                                        'full_name', p.full_name)
                                     ORDER BY p.full_name)
               ) AS x
        FROM public.winter_plans w
        LEFT JOIN public.profiles p ON p.user_id = w.user_id
        WHERE w.season_year = date_part('year', now())::int
        GROUP BY w.answer
      ) s
    ), '[]'::jsonb)
  )
  WHERE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
$$;

-- Fiber leadership: who chose Fiber and where their application stands.
CREATE OR REPLACE FUNCTION public.get_fiber_winter_interest()
RETURNS TABLE(user_id uuid, full_name text, answered_at timestamptz, application_status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT w.user_id,
         p.full_name,
         w.updated_at,
         COALESCE(e.status::text, 'not started')
  FROM public.winter_plans w
  LEFT JOIN public.profiles p ON p.user_id = w.user_id
  LEFT JOIN public.rep_vertical_enrollments e
    ON e.user_id = w.user_id AND e.vertical = 'Fiber'
  WHERE w.answer = 'Fiber'
    AND w.season_year = date_part('year', now())::int
    AND (public.has_role(auth.uid(), 'admin')
         OR public.has_role(auth.uid(), 'owner')
         OR public.is_president_of_vertical('Fiber'))
  ORDER BY p.full_name
$$;

-- Owner/admin: clear a rep's answer so the prompt shows again.
CREATE OR REPLACE FUNCTION public.reopen_winter_plan(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  DELETE FROM public.winter_plans
   WHERE user_id = _user_id AND season_year = date_part('year', now())::int;
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.get_my_winter_plan() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_my_winter_plan(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_winter_plan_summary() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_fiber_winter_interest() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reopen_winter_plan(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_winter_plan() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_my_winter_plan(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_winter_plan_summary() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_fiber_winter_interest() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.reopen_winter_plan(uuid) TO authenticated, service_role;