-- ============ PASS 15: RECRUITING CONTENT ============

CREATE TABLE public.recruiting_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  time_label text NOT NULL DEFAULT '',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiting_timeline TO authenticated;
GRANT ALL ON public.recruiting_timeline TO service_role;
ALTER TABLE public.recruiting_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage timeline" ON public.recruiting_timeline FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));
CREATE POLICY "Members read timeline" ON public.recruiting_timeline FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_recruiting_timeline_updated BEFORE UPDATE ON public.recruiting_timeline
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recruiting_faq (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiting_faq TO authenticated;
GRANT ALL ON public.recruiting_faq TO service_role;
ALTER TABLE public.recruiting_faq ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage faq" ON public.recruiting_faq FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));
CREATE POLICY "Members read faq" ON public.recruiting_faq FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_recruiting_faq_updated BEFORE UPDATE ON public.recruiting_faq
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.recruiting_testimonials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_name text NOT NULL,
  school text,
  first_summer_figure text,
  quote text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiting_testimonials TO authenticated;
GRANT ALL ON public.recruiting_testimonials TO service_role;
ALTER TABLE public.recruiting_testimonials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage testimonials" ON public.recruiting_testimonials FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));
CREATE POLICY "Members read testimonials" ON public.recruiting_testimonials FOR SELECT TO authenticated USING (true);
CREATE TRIGGER trg_recruiting_testimonials_updated BEFORE UPDATE ON public.recruiting_testimonials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- FAQ question stubs (answers intentionally left NULL — unanswered questions never render)
INSERT INTO public.recruiting_faq (question, display_order) VALUES
  ('Is this a pyramid thing?', 1),
  ('Do I need experience?', 2),
  ('Where do I live?', 3),
  ('How does pay actually work?', 4),
  ('How many hours a week is this?', 5),
  ('What does it cost me to start?', 6);

-- ---------- cached public counters ----------
CREATE TABLE public.public_counter_cache (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  active_reps integer NOT NULL DEFAULT 0,
  signed_season integer NOT NULL DEFAULT 0,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.public_counter_cache TO authenticated;
GRANT ALL ON public.public_counter_cache TO service_role;
ALTER TABLE public.public_counter_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read counter cache" ON public.public_counter_cache FOR SELECT TO authenticated USING (true);
INSERT INTO public.public_counter_cache (id) VALUES (true);

CREATE OR REPLACE FUNCTION public.get_public_counters()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c public.public_counter_cache;
  season_start date;
  min_reps int;
  min_signs int;
BEGIN
  SELECT * INTO c FROM public.public_counter_cache WHERE id;

  IF c.refreshed_at < now() - interval '10 minutes' THEN
    season_start := (date_trunc('year', now())::date + interval '3 months')::date; -- Apr 1
    IF now()::date < season_start THEN
      season_start := (date_trunc('year', now() - interval '1 year')::date + interval '3 months')::date;
    END IF;

    UPDATE public.public_counter_cache SET
      active_reps = (
        SELECT count(*) FROM public.profiles
        WHERE archived = false AND approved = true
          AND COALESCE(status::text,'') NOT IN ('nlc','rejected','pending')
      ),
      signed_season = (
        SELECT count(*) FROM public.rep_signups WHERE signed_at >= season_start
      ),
      refreshed_at = now()
    WHERE id;

    SELECT * INTO c FROM public.public_counter_cache WHERE id;
  END IF;

  min_reps := COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key='public_counter_min_reps'),'')::int, 10);
  min_signs := COALESCE(NULLIF((SELECT value FROM public.app_settings WHERE key='public_counter_min_signs'),'')::int, 5);

  RETURN jsonb_build_object(
    'active_reps', CASE WHEN c.active_reps >= min_reps THEN c.active_reps ELSE NULL END,
    'signed_season', CASE WHEN c.signed_season >= min_signs THEN c.signed_season ELSE NULL END
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_counters() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_counters() TO anon, authenticated;

-- ---------- public recruiting content feed ----------
CREATE OR REPLACE FUNCTION public.get_recruiting_content()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'settings', COALESCE((
      SELECT jsonb_object_agg(key, value) FROM public.app_settings
      WHERE key LIKE 'recruiting_content_%' AND COALESCE(value,'') <> ''
    ), '{}'::jsonb),
    'parents', COALESCE((
      SELECT jsonb_object_agg(key, value) FROM public.app_settings
      WHERE key LIKE 'parents_%' AND COALESCE(value,'') <> ''
    ), '{}'::jsonb),
    'timeline', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('time_label', time_label, 'title', title, 'body', body)
                       ORDER BY display_order, created_at)
      FROM public.recruiting_timeline WHERE is_active AND btrim(title) <> ''
    ), '[]'::jsonb),
    'faq', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('question', question, 'answer', answer)
                       ORDER BY display_order, created_at)
      FROM public.recruiting_faq WHERE is_active AND btrim(COALESCE(answer,'')) <> ''
    ), '[]'::jsonb),
    'testimonials', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('rep_name', rep_name, 'school', school,
                                          'first_summer_figure', first_summer_figure, 'quote', quote)
                       ORDER BY display_order, created_at)
      FROM public.recruiting_testimonials WHERE is_active AND btrim(rep_name) <> ''
    ), '[]'::jsonb)
  );
$$;
REVOKE ALL ON FUNCTION public.get_recruiting_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiting_content() TO anon, authenticated;

-- ---------- ticket series status ----------
CREATE OR REPLACE FUNCTION public.get_ticket_series_status()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'series_total', 100,
    'claimed', (
      SELECT count(DISTINCT ref_code) FROM public.recruiting_leads
      WHERE ref_code ~ '^[0-9]{1,3}$' AND ref_code::int BETWEEN 1 AND 100
    )
  );
$$;
REVOKE ALL ON FUNCTION public.get_ticket_series_status() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_series_status() TO anon, authenticated;

-- ---------- personal ref codes ----------
CREATE OR REPLACE FUNCTION public.ensure_rep_ref_code(_user_id uuid)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing text;
  base text;
  candidate text;
  n int := 1;
  fname text;
BEGIN
  SELECT code INTO existing FROM public.recruiting_ref_codes
  WHERE assigned_user_id = _user_id ORDER BY created_at LIMIT 1;
  IF existing IS NOT NULL THEN RETURN existing; END IF;

  SELECT full_name INTO fname FROM public.profiles WHERE user_id = _user_id;
  base := lower(regexp_replace(COALESCE(fname,''), '[^a-zA-Z]', '', 'g'));
  IF length(base) < 3 THEN base := 'rep'; END IF;
  base := left(base, 14);

  candidate := base;
  WHILE EXISTS (SELECT 1 FROM public.recruiting_ref_codes WHERE lower(code) = candidate) LOOP
    n := n + 1;
    candidate := base || n::text;
  END LOOP;

  INSERT INTO public.recruiting_ref_codes (code, label, assigned_user_id, created_by)
  VALUES (candidate, COALESCE(fname, 'Rep') || ' — personal code', _user_id, _user_id)
  ON CONFLICT DO NOTHING;

  SELECT code INTO existing FROM public.recruiting_ref_codes
  WHERE assigned_user_id = _user_id ORDER BY created_at LIMIT 1;
  RETURN existing;
END;
$$;
REVOKE ALL ON FUNCTION public.ensure_rep_ref_code(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_rep_ref_code(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_my_ref_code()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ok boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN NULL; END IF;
  SELECT (approved AND NOT archived) INTO ok FROM public.profiles WHERE user_id = auth.uid();
  IF NOT COALESCE(ok, false) THEN RETURN NULL; END IF;
  RETURN public.ensure_rep_ref_code(auth.uid());
END;
$$;
REVOKE ALL ON FUNCTION public.get_my_ref_code() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_ref_code() TO authenticated;

CREATE OR REPLACE FUNCTION public.assign_ref_code_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved AND NOT NEW.archived THEN
    PERFORM public.ensure_rep_ref_code(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assign_ref_code
AFTER INSERT OR UPDATE OF approved, archived ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.assign_ref_code_on_approval();

-- backfill personal codes for the current active roster
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT user_id FROM public.profiles
           WHERE approved = true AND archived = false AND user_id IS NOT NULL
  LOOP
    PERFORM public.ensure_rep_ref_code(r.user_id);
  END LOOP;
END $$;

-- ============ PASS 16: TRAINING 2.0 ============

CREATE TABLE public.training_drills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT 'objection',
  scenario text NOT NULL,
  model_answer text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.training_drills TO authenticated;
GRANT ALL ON public.training_drills TO service_role;
ALTER TABLE public.training_drills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read active drills" ON public.training_drills FOR SELECT TO authenticated USING (is_active);
CREATE POLICY "Admins manage drills" ON public.training_drills FOR ALL TO authenticated
  USING (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'))
  WITH CHECK (has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner'));
CREATE TRIGGER trg_training_drills_updated BEFORE UPDATE ON public.training_drills
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.drill_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  drill_id uuid NOT NULL REFERENCES public.training_drills(id) ON DELETE CASCADE,
  drill_date date NOT NULL,
  response text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, drill_date)
);
GRANT SELECT, INSERT ON public.drill_completions TO authenticated;
GRANT ALL ON public.drill_completions TO service_role;
ALTER TABLE public.drill_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Reps read own drill completions" ON public.drill_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role(auth.uid(),'admin') OR has_role(auth.uid(),'owner') OR has_role(auth.uid(),'manager'));
CREATE POLICY "Reps insert own drill completions" ON public.drill_completions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.get_daily_drill(_timezone text DEFAULT 'America/New_York')
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total int;
  today date;
  idx int;
  d public.training_drills;
  done public.drill_completions;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('drill', NULL, 'total', 0); END IF;

  today := (now() AT TIME ZONE COALESCE(NULLIF(_timezone,''), 'America/New_York'))::date;
  SELECT count(*) INTO total FROM public.training_drills WHERE is_active;
  IF total = 0 THEN RETURN jsonb_build_object('drill', NULL, 'total', 0); END IF;

  idx := (today - date '2026-01-01') % total;
  SELECT * INTO d FROM public.training_drills WHERE is_active
    ORDER BY display_order, created_at OFFSET idx LIMIT 1;

  SELECT * INTO done FROM public.drill_completions
    WHERE user_id = auth.uid() AND drill_date = today;

  RETURN jsonb_build_object(
    'total', total,
    'drill_date', today,
    'drill', jsonb_build_object(
      'id', d.id, 'category', d.category, 'scenario', d.scenario, 'model_answer', d.model_answer
    ),
    'completed', done.id IS NOT NULL,
    'my_response', done.response
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_daily_drill(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_daily_drill(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.complete_daily_drill(_drill_id uuid, _response text, _timezone text DEFAULT 'America/New_York')
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today date;
  inserted boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated'); END IF;
  IF NOT EXISTS (SELECT 1 FROM public.training_drills WHERE id = _drill_id AND is_active) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'drill not found');
  END IF;

  today := (now() AT TIME ZONE COALESCE(NULLIF(_timezone,''), 'America/New_York'))::date;

  INSERT INTO public.drill_completions (user_id, drill_id, drill_date, response)
  VALUES (auth.uid(), _drill_id, today, left(COALESCE(_response,''), 4000))
  ON CONFLICT (user_id, drill_date) DO NOTHING;

  inserted := FOUND;

  IF inserted THEN
    PERFORM public.record_daily_login(auth.uid(), COALESCE(NULLIF(_timezone,''), 'America/New_York'));
    PERFORM public.award_points_v2(auth.uid(), 'training', 15,
      jsonb_build_object('source', 'daily_drill', 'drill_id', _drill_id, 'drill_date', today));
  END IF;

  RETURN jsonb_build_object('ok', true, 'first_today', inserted);
END;
$$;
REVOKE ALL ON FUNCTION public.complete_daily_drill(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_daily_drill(uuid, text, text) TO authenticated;

-- ---------- course audience ----------
ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'rookie';
ALTER TABLE public.training_courses
  ADD CONSTRAINT training_courses_audience_check CHECK (audience IN ('rookie','vet','manager'));

-- ---------- standalone pitch submissions ----------
ALTER TABLE public.pitch_approval_requests ALTER COLUMN lesson_id DROP NOT NULL;