WITH course AS (
  SELECT id FROM public.training_courses WHERE slug = 'learn-your-pitch'
), mod AS (
  INSERT INTO public.training_modules (course_id, title, description, display_order, is_active)
  SELECT course.id, 'Field Playbook', 'The pitch script, objections and closes as written by the owner.',
         COALESCE((SELECT MAX(display_order) + 1 FROM public.training_modules m WHERE m.course_id = course.id), 1),
         true
  FROM course
  RETURNING id
)
INSERT INTO public.training_lessons (module_id, title, content, key_takeaways, display_order, is_active)
SELECT mod.id, p.title, p.body,
       CASE WHEN COALESCE(NULLIF(p.meta->>'notes', ''), '') = '' THEN NULL
            ELSE ARRAY[p.meta->>'notes'] END,
       p.sort_order, true
FROM mod, public.playbook_entries p
WHERE p.vertical = 'Pest' AND p.kind = 'script'
ORDER BY p.sort_order;

INSERT INTO public.training_drills (category, scenario, model_answer, display_order, is_active, vertical)
SELECT 'Objections', p.title,
       p.body || CASE WHEN COALESCE(p.followup, '') = '' THEN '' ELSE E'\n\n' || p.followup END,
       100 + p.sort_order, true, 'Pest'
FROM public.playbook_entries p
WHERE p.vertical = 'Pest' AND p.kind = 'objection';

INSERT INTO public.training_drills (category, scenario, model_answer, display_order, is_active, vertical)
SELECT 'Closes', 'Run the ' || p.title, p.body, 200 + p.sort_order, true, 'Pest'
FROM public.playbook_entries p
WHERE p.vertical = 'Pest' AND p.kind = 'close';