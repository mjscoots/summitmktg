ALTER TABLE public.recruiting_testimonials
  ADD COLUMN IF NOT EXISTS photo_url text,
  ADD COLUMN IF NOT EXISTS office text;

CREATE OR REPLACE FUNCTION public.get_public_cover_content()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'facts', (
      SELECT jsonb_object_agg(s.key, coalesce(s.value, ''))
        FROM public.app_settings s
       WHERE s.key IN ('public_fact_season_window','public_fact_markets','public_fact_housing','public_fact_training')
    ),
    'steps', (
      SELECT jsonb_object_agg(s.key, coalesce(s.value, ''))
        FROM public.app_settings s
       WHERE s.key IN ('public_step_apply','public_step_call','public_step_sign','public_step_train','public_step_knock')
    ),
    'faq', coalesce((
      SELECT jsonb_agg(jsonb_build_object('question', f.question, 'answer', f.answer) ORDER BY f.display_order)
        FROM public.recruiting_faq f
       WHERE f.is_active AND coalesce(f.answer, '') <> ''
    ), '[]'::jsonb),
    'stories', coalesce((
      SELECT jsonb_agg(jsonb_build_object(
               'first_name', split_part(t.rep_name, ' ', 1),
               'office', coalesce(t.office, t.school),
               'line', t.quote,
               'photo_url', t.photo_url) ORDER BY t.display_order)
        FROM public.recruiting_testimonials t
       WHERE t.is_active AND coalesce(t.quote, '') <> ''
    ), '[]'::jsonb)
  );
$$;

REVOKE ALL ON FUNCTION public.get_public_cover_content() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_cover_content() TO anon, authenticated, service_role;