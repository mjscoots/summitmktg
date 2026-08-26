CREATE OR REPLACE FUNCTION public.get_daily_drill(_timezone text DEFAULT 'America/New_York'::text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  total int;
  today date;
  idx int;
  vert text;
  d public.training_drills;
  done public.drill_completions;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('drill', NULL, 'total', 0); END IF;

  vert := public.my_active_vertical();
  today := (now() AT TIME ZONE COALESCE(NULLIF(_timezone,''), 'America/New_York'))::date;
  SELECT count(*) INTO total FROM public.training_drills
    WHERE is_active AND (vertical IS NULL OR vertical = vert);
  IF total = 0 THEN RETURN jsonb_build_object('drill', NULL, 'total', 0); END IF;

  idx := (today - date '2026-01-01') % total;
  SELECT * INTO d FROM public.training_drills
    WHERE is_active AND (vertical IS NULL OR vertical = vert)
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
$function$;