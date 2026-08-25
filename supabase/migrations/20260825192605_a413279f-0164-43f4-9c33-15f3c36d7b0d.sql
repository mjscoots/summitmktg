-- ============ VERTICAL PATHS ============
CREATE TABLE public.vertical_paths (
  vertical text PRIMARY KEY,
  label text NOT NULL,
  description text,
  is_configured boolean NOT NULL DEFAULT false,
  display_order integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.vertical_paths TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vertical_paths TO authenticated;
GRANT ALL ON public.vertical_paths TO service_role;
ALTER TABLE public.vertical_paths ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vertical_paths_read" ON public.vertical_paths FOR SELECT TO authenticated USING (true);
CREATE POLICY "vertical_paths_admin_write" ON public.vertical_paths FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

-- ============ VERTICAL STEPS ============
CREATE TABLE public.vertical_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vertical text NOT NULL REFERENCES public.vertical_paths(vertical) ON DELETE CASCADE,
  display_order integer NOT NULL DEFAULT 1,
  title text NOT NULL,
  description text,
  step_type text NOT NULL DEFAULT 'task' CHECK (step_type IN ('task','upload','training','approval')),
  course_id uuid REFERENCES public.training_courses(id) ON DELETE SET NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_vertical_steps_vertical ON public.vertical_steps(vertical, display_order);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.vertical_steps TO authenticated;
GRANT ALL ON public.vertical_steps TO service_role;
ALTER TABLE public.vertical_steps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vertical_steps_read" ON public.vertical_steps FOR SELECT TO authenticated USING (true);
CREATE POLICY "vertical_steps_admin_write" ON public.vertical_steps FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

-- ============ ENROLLMENTS ============
CREATE TABLE public.rep_vertical_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vertical text NOT NULL REFERENCES public.vertical_paths(vertical) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'interested' CHECK (status IN ('interested','onboarding','active')),
  current_step integer NOT NULL DEFAULT 1,
  paired_manager uuid,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, vertical)
);
GRANT SELECT, INSERT, UPDATE ON public.rep_vertical_enrollments TO authenticated;
GRANT ALL ON public.rep_vertical_enrollments TO service_role;
ALTER TABLE public.rep_vertical_enrollments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "enroll_own_read" ON public.rep_vertical_enrollments FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner'));
CREATE POLICY "enroll_own_insert" ON public.rep_vertical_enrollments FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "enroll_admin_update" ON public.rep_vertical_enrollments FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

-- ============ STEP COMPLETIONS ============
CREATE TABLE public.vertical_step_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  vertical text NOT NULL,
  step_id uuid NOT NULL REFERENCES public.vertical_steps(id) ON DELETE CASCADE,
  file_path text,
  notes text,
  approved_by uuid,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, step_id)
);
GRANT SELECT ON public.vertical_step_completions TO authenticated;
GRANT ALL ON public.vertical_step_completions TO service_role;
ALTER TABLE public.vertical_step_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vsc_read" ON public.vertical_step_completions FOR SELECT TO authenticated
  USING (user_id = auth.uid()
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner'));

-- ============ STORAGE POLICIES (vertical-proof, own folder) ============
CREATE POLICY "vertical_proof_own_read" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'vertical-proof' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(),'manager')
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner')));
CREATE POLICY "vertical_proof_own_insert" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'vertical-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vertical_proof_own_update" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'vertical-proof' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "vertical_proof_own_delete" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'vertical-proof' AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'owner')));

-- ============ SEEDS ============
INSERT INTO public.vertical_paths (vertical, label, description, is_configured, display_order) VALUES
  ('Pest','Pest Control','Door-to-door pest control sales. This is the core Summit business: reps learn the pitch, work an assigned area, and sell recurring service agreements.', true, 1),
  ('Fiber','Fiber Internet', NULL, false, 2),
  ('Life','Life Insurance', NULL, false, 3);

INSERT INTO public.vertical_steps (vertical, display_order, title, description, step_type, course_id)
SELECT 'Pest', 1, 'Complete rookie training', 'Finish the Learn Your Pitch course.', 'training', id
FROM public.training_courses WHERE slug = 'learn-your-pitch' LIMIT 1;

INSERT INTO public.vertical_steps (vertical, display_order, title, description, step_type)
VALUES ('Pest', 2, 'Manager sign-off', 'Your manager confirms you are ready for the field.', 'approval');

INSERT INTO public.vertical_steps (vertical, display_order, title, description, step_type) VALUES
  ('Fiber', 1, 'Setup steps not configured yet', NULL, 'task'),
  ('Life', 1, 'Setup steps not configured yet', NULL, 'task');

-- ============ HELPERS ============
CREATE OR REPLACE FUNCTION public.is_course_complete(_user uuid, _course uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _course IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.training_lessons l
      JOIN public.training_modules m ON m.id = l.module_id
      WHERE m.course_id = _course AND m.is_active AND l.is_active
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.training_lessons l
      JOIN public.training_modules m ON m.id = l.module_id
      WHERE m.course_id = _course AND m.is_active AND l.is_active
        AND NOT EXISTS (
          SELECT 1 FROM public.lesson_progress lp
          WHERE lp.user_id = _user AND lp.lesson_id = l.id AND lp.completed_at IS NOT NULL
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.recalc_vertical_enrollment(_user uuid, _vertical text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _step record;
  _next integer;
  _total integer;
  _configured boolean;
  _label text;
  _name text;
BEGIN
  SELECT is_configured, label INTO _configured, _label FROM public.vertical_paths WHERE vertical = _vertical;
  IF NOT FOUND THEN RETURN; END IF;

  FOR _step IN SELECT * FROM public.vertical_steps
    WHERE vertical = _vertical AND is_active AND step_type = 'training' LOOP
    IF public.is_course_complete(_user, _step.course_id) THEN
      INSERT INTO public.vertical_step_completions (user_id, vertical, step_id)
      VALUES (_user, _vertical, _step.id)
      ON CONFLICT (user_id, step_id) DO NOTHING;
    END IF;
  END LOOP;

  SELECT count(*) INTO _total FROM public.vertical_steps WHERE vertical = _vertical AND is_active;
  SELECT min(display_order) INTO _next FROM public.vertical_steps s
    WHERE s.vertical = _vertical AND s.is_active
      AND NOT EXISTS (SELECT 1 FROM public.vertical_step_completions c
                      WHERE c.user_id = _user AND c.step_id = s.id);

  IF _total = 0 OR NOT _configured THEN
    UPDATE public.rep_vertical_enrollments
      SET current_step = COALESCE(_next, 1), updated_at = now()
      WHERE user_id = _user AND vertical = _vertical AND status <> 'active';
    RETURN;
  END IF;

  IF _next IS NULL THEN
    UPDATE public.rep_vertical_enrollments
      SET status = 'active', current_step = _total,
          activated_at = COALESCE(activated_at, now()), updated_at = now()
      WHERE user_id = _user AND vertical = _vertical AND status <> 'active';

    IF FOUND THEN
      UPDATE public.profiles SET vertical = _vertical WHERE user_id = _user;
      IF NOT EXISTS (
        SELECT 1 FROM public.chat_messages
        WHERE channel = 'wins' AND content LIKE '[[VERT|' || _user::text || '|' || _vertical || '%'
      ) THEN
        SELECT COALESCE(full_name, 'A rep') INTO _name FROM public.profiles WHERE user_id = _user;
        INSERT INTO public.chat_messages (user_id, content, is_ai, channel)
        VALUES (_user,
          '[[VERT|' || _user::text || '|' || _vertical || ']]' || COALESCE(_name,'A rep') || ' is live in ' || COALESCE(_label, _vertical),
          true, 'wins');
      END IF;
    END IF;
  ELSE
    UPDATE public.rep_vertical_enrollments
      SET status = 'onboarding', current_step = _next, updated_at = now()
      WHERE user_id = _user AND vertical = _vertical AND status <> 'active';
  END IF;
END;
$$;

-- ============ HUB ============
CREATE OR REPLACE FUNCTION public.get_industry_hub()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('verticals','[]'::jsonb); END IF;
  RETURN jsonb_build_object('verticals', COALESCE((
    SELECT jsonb_agg(v ORDER BY (v->>'display_order')::int) FROM (
      SELECT jsonb_build_object(
        'vertical', p.vertical,
        'label', p.label,
        'description', p.description,
        'is_configured', p.is_configured,
        'display_order', p.display_order,
        'step_count', (SELECT count(*) FROM public.vertical_steps s WHERE s.vertical = p.vertical AND s.is_active),
        'active_count', (SELECT count(*) FROM public.profiles pr
                          WHERE COALESCE(pr.vertical,'Pest') = p.vertical
                            AND COALESCE(pr.archived,false) = false
                            AND COALESCE(pr.approved,false) = true),
        'lead', (SELECT jsonb_build_object('full_name', pr.full_name, 'avatar_url', pr.avatar_url)
                 FROM public.profiles pr
                 WHERE pr.runs_vertical = true AND pr.vertical = p.vertical
                   AND COALESCE(pr.archived,false) = false LIMIT 1),
        'my_enrollment', (SELECT jsonb_build_object('status', e.status, 'current_step', e.current_step)
                          FROM public.rep_vertical_enrollments e
                          WHERE e.user_id = _uid AND e.vertical = p.vertical)
      ) AS v
      FROM public.vertical_paths p
    ) x
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.join_vertical(_vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _configured boolean;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  SELECT is_configured INTO _configured FROM public.vertical_paths WHERE vertical = _vertical;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Unknown industry'); END IF;

  INSERT INTO public.rep_vertical_enrollments (user_id, vertical, status, current_step, paired_manager)
  VALUES (_uid, _vertical, CASE WHEN _configured THEN 'onboarding' ELSE 'interested' END, 1,
          (SELECT dm.user_id FROM public.profiles me
             JOIN public.profiles dm ON dm.full_name = me.direct_manager
            WHERE me.user_id = _uid LIMIT 1))
  ON CONFLICT (user_id, vertical) DO NOTHING;

  IF _configured THEN
    PERFORM public.recalc_vertical_enrollment(_uid, _vertical);
  END IF;

  RETURN jsonb_build_object('success', true, 'configured', COALESCE(_configured,false),
    'status', (SELECT status FROM public.rep_vertical_enrollments WHERE user_id = _uid AND vertical = _vertical));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_vertical_path(_vertical text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _res jsonb; _next integer;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('steps','[]'::jsonb); END IF;
  PERFORM public.recalc_vertical_enrollment(_uid, _vertical);

  SELECT min(display_order) INTO _next FROM public.vertical_steps s
    WHERE s.vertical = _vertical AND s.is_active
      AND NOT EXISTS (SELECT 1 FROM public.vertical_step_completions c
                      WHERE c.user_id = _uid AND c.step_id = s.id);

  SELECT jsonb_build_object(
    'vertical', p.vertical,
    'label', p.label,
    'is_configured', p.is_configured,
    'enrollment', (SELECT to_jsonb(e) FROM public.rep_vertical_enrollments e
                    WHERE e.user_id = _uid AND e.vertical = p.vertical),
    'steps', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', s.id,
        'display_order', s.display_order,
        'title', s.title,
        'description', s.description,
        'step_type', s.step_type,
        'course_id', s.course_id,
        'course_slug', (SELECT c.slug FROM public.training_courses c WHERE c.id = s.course_id),
        'course_title', (SELECT c.title FROM public.training_courses c WHERE c.id = s.course_id),
        'completed_at', comp.completed_at,
        'file_path', comp.file_path,
        'state', CASE WHEN comp.id IS NOT NULL THEN 'done'
                      WHEN s.display_order = _next THEN 'current'
                      ELSE 'locked' END
      ) ORDER BY s.display_order)
      FROM public.vertical_steps s
      LEFT JOIN public.vertical_step_completions comp
        ON comp.step_id = s.id AND comp.user_id = _uid
      WHERE s.vertical = p.vertical AND s.is_active
    ), '[]'::jsonb)
  ) INTO _res
  FROM public.vertical_paths p WHERE p.vertical = _vertical;

  RETURN COALESCE(_res, jsonb_build_object('steps','[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_vertical_step(_step_id uuid, _file_path text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s record;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Not signed in'); END IF;
  SELECT * INTO _s FROM public.vertical_steps WHERE id = _step_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Step not found'); END IF;
  IF _s.step_type NOT IN ('task','upload') THEN
    RETURN jsonb_build_object('success', false, 'error', 'This step cannot be self-completed');
  END IF;
  IF _s.step_type = 'upload' AND COALESCE(_file_path,'') = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'A file is required');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.rep_vertical_enrollments
                 WHERE user_id = _uid AND vertical = _s.vertical) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not enrolled');
  END IF;

  INSERT INTO public.vertical_step_completions (user_id, vertical, step_id, file_path)
  VALUES (_uid, _s.vertical, _s.id, _file_path)
  ON CONFLICT (user_id, step_id) DO UPDATE SET file_path = COALESCE(EXCLUDED.file_path, public.vertical_step_completions.file_path);

  PERFORM public.recalc_vertical_enrollment(_uid, _s.vertical);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_vertical_step(_user_id uuid, _step_id uuid, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _s record;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not allowed');
  END IF;
  SELECT * INTO _s FROM public.vertical_steps WHERE id = _step_id AND is_active;
  IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Step not found'); END IF;

  INSERT INTO public.vertical_step_completions (user_id, vertical, step_id, approved_by, notes)
  VALUES (_user_id, _s.vertical, _s.id, _uid, _notes)
  ON CONFLICT (user_id, step_id) DO UPDATE SET approved_by = _uid, notes = COALESCE(EXCLUDED.notes, public.vertical_step_completions.notes);

  PERFORM public.recalc_vertical_enrollment(_user_id, _s.vertical);
  RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_vertical_enrollments()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('rows','[]'::jsonb);
  END IF;
  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', e.user_id,
      'full_name', pr.full_name,
      'avatar_url', pr.avatar_url,
      'vertical', e.vertical,
      'label', vp.label,
      'status', e.status,
      'current_step', e.current_step,
      'steps_total', (SELECT count(*) FROM public.vertical_steps s WHERE s.vertical = e.vertical AND s.is_active),
      'steps_done', (SELECT count(*) FROM public.vertical_step_completions c
                      JOIN public.vertical_steps s2 ON s2.id = c.step_id AND s2.is_active
                      WHERE c.user_id = e.user_id AND c.vertical = e.vertical),
      'paired_manager', (SELECT m.full_name FROM public.profiles m WHERE m.user_id = e.paired_manager),
      'updated_at', e.updated_at
    ) ORDER BY e.updated_at DESC)
    FROM public.rep_vertical_enrollments e
    JOIN public.vertical_paths vp ON vp.vertical = e.vertical
    LEFT JOIN public.profiles pr ON pr.user_id = e.user_id
    WHERE COALESCE(pr.archived,false) = false
  ), '[]'::jsonb));
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_vertical_approvals()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('rows','[]'::jsonb);
  END IF;
  RETURN jsonb_build_object('rows', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'user_id', e.user_id,
      'full_name', pr.full_name,
      'vertical', e.vertical,
      'label', vp.label,
      'step_id', s.id,
      'step_title', s.title
    ))
    FROM public.rep_vertical_enrollments e
    JOIN public.vertical_paths vp ON vp.vertical = e.vertical
    LEFT JOIN public.profiles pr ON pr.user_id = e.user_id
    JOIN public.vertical_steps s ON s.vertical = e.vertical AND s.is_active
      AND s.step_type = 'approval' AND s.display_order = e.current_step
    WHERE e.status = 'onboarding' AND COALESCE(pr.archived,false) = false
      AND NOT EXISTS (SELECT 1 FROM public.vertical_step_completions c
                      WHERE c.user_id = e.user_id AND c.step_id = s.id)
  ), '[]'::jsonb));
END;
$$;

-- ============ EXECUTE GRANTS ============
REVOKE ALL ON FUNCTION public.is_course_complete(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.recalc_vertical_enrollment(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_industry_hub() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_vertical(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_my_vertical_path(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.complete_vertical_step(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.approve_vertical_step(uuid, uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_vertical_enrollments() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_pending_vertical_approvals() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_industry_hub() TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_vertical(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_vertical_path(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.complete_vertical_step(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_vertical_step(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_vertical_enrollments() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_vertical_approvals() TO authenticated;

CREATE TRIGGER trg_vertical_paths_updated BEFORE UPDATE ON public.vertical_paths
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vertical_steps_updated BEFORE UPDATE ON public.vertical_steps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_vertical_enroll_updated BEFORE UPDATE ON public.rep_vertical_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();