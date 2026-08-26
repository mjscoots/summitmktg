ALTER TABLE public.home_questions ADD COLUMN IF NOT EXISTS link_key text;

UPDATE public.home_questions
SET link_key = 'winter_plan',
    choices = '["Fiber", "Life", "Off this winter", "Not sure yet"]'::jsonb
WHERE question = 'What is your plan for the winter?';

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
  v_pest boolean;
  v_q record;
  v_period text;
BEGIN
  IF v_me IS NULL THEN RETURN NULL; END IF;
  SELECT active_vertical INTO v_vertical FROM public.profiles WHERE user_id = v_me;
  SELECT role::text INTO v_role FROM public.user_roles WHERE user_id = v_me ORDER BY role LIMIT 1;
  SELECT EXISTS (
    SELECT 1 FROM public.rep_vertical_enrollments
    WHERE user_id = v_me AND vertical = 'Pest' AND status = 'active'
  ) INTO v_pest;

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
    -- The winter plan keeps its own card on the home screen for Pest members.
    IF v_q.link_key = 'winter_plan' THEN
      IF v_pest OR EXISTS (SELECT 1 FROM public.winter_plans WHERE user_id = v_me) THEN
        CONTINUE;
      END IF;
    END IF;

    v_period := CASE WHEN v_q.cadence = 'weekly'
      THEN to_char(date_trunc('week', CURRENT_DATE), 'YYYY-MM-DD') ELSE 'once' END;

    IF NOT EXISTS (
      SELECT 1 FROM public.home_question_answers
      WHERE question_id = v_q.id AND user_id = v_me AND period = v_period
    ) THEN
      RETURN jsonb_build_object(
        'id', v_q.id, 'question', v_q.question, 'helper', v_q.helper,
        'answer_type', v_q.answer_type, 'choices', v_q.choices,
        'link_key', v_q.link_key, 'period', v_period);
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.get_open_home_question() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_open_home_question() TO authenticated;