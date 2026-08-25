ALTER TABLE public.rank_requirements DROP CONSTRAINT IF EXISTS rank_requirements_rule_type_check;
ALTER TABLE public.rank_requirements ADD CONSTRAINT rank_requirements_rule_type_check
  CHECK (rule_type = ANY (ARRAY[
    'installs_total','installs_per_week','weeks_active','producing_reps',
    'team_leads_under','managers_under','custom_text',
    'personal_active_revenue','team_active_revenue'
  ]));

CREATE OR REPLACE FUNCTION public.admin_set_vertical_lead(_user_id uuid, _vertical text, _is_lead boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin'::app_role) OR public.has_role(auth.uid(),'owner'::app_role)) THEN
    RETURN jsonb_build_object('error','not authorized');
  END IF;

  IF _is_lead THEN
    UPDATE public.profiles SET vertical = _vertical, runs_vertical = true, updated_at = now()
    WHERE user_id = _user_id;
  ELSE
    UPDATE public.profiles SET runs_vertical = false, updated_at = now()
    WHERE user_id = _user_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_set_vertical_lead(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_vertical_lead(uuid, text, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.autocomplete_fiber_first_install()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _step_id uuid;
BEGIN
  SELECT id INTO _step_id FROM public.vertical_steps
  WHERE vertical = 'Fiber' AND title = 'First install logged' AND is_active
  LIMIT 1;

  IF _step_id IS NULL OR NEW.user_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.vertical_step_completions (user_id, step_id, vertical, completed_at)
  SELECT NEW.user_id, _step_id, 'Fiber', now()
  WHERE NOT EXISTS (
    SELECT 1 FROM public.vertical_step_completions c
    WHERE c.user_id = NEW.user_id AND c.step_id = _step_id
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_autocomplete_fiber_first_install ON public.fiber_installs;
CREATE TRIGGER trg_autocomplete_fiber_first_install
AFTER INSERT ON public.fiber_installs
FOR EACH ROW EXECUTE FUNCTION public.autocomplete_fiber_first_install();