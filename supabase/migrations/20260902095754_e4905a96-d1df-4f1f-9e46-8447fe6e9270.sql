CREATE OR REPLACE FUNCTION public.badges_for(_user_ids uuid[])
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT COALESCE(jsonb_object_agg(t.user_id::text, jsonb_build_object(
    'locked_in', t.locked_in,
    'blitz_patches', t.blitz_patches,
    'recruiter_stars', t.recruiter_stars
  )), '{}'::jsonb)
  FROM (
    SELECT p.user_id,
      (
        EXISTS (
          SELECT 1 FROM public.people_leads pl
          WHERE pl.profile_id = p.id AND pl.signed_2027 IS TRUE
        )
        OR EXISTS (
          SELECT 1 FROM public.resign_intents ri
          WHERE ri.user_id = p.user_id AND ri.status = 'confirmed'
        )
      ) AS locked_in,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
                 'title', COALESCE(NULLIF(BTRIM(e.location), ''), e.title),
                 'year', EXTRACT(YEAR FROM e.event_date)::int
               ) ORDER BY e.event_date DESC)
        FROM public.calendar_attendance ca
        JOIN public.calendar_events e ON e.id = ca.event_id
        WHERE ca.user_id = p.user_id
          AND ca.present IS TRUE
          AND e.event_kind = 'blitz'
      ), '[]'::jsonb) AS blitz_patches,
      (
        SELECT COUNT(*)::int FROM public.profiles r
        WHERE r.user_id <> p.user_id
          AND (
            r.recruited_by_user_id = p.user_id
            OR r.recruiter_id = p.user_id
            OR EXISTS (
              SELECT 1 FROM public.invites i
              WHERE i.joined_user_id = r.user_id AND i.created_by = p.user_id
            )
          )
          AND (public.onboarding_state(r.user_id) ->> 'fully_onboarded')::boolean IS TRUE
      ) AS recruiter_stars
    FROM public.profiles p
    WHERE p.user_id = ANY(_user_ids)
      AND auth.uid() IS NOT NULL
  ) t
$function$;

REVOKE ALL ON FUNCTION public.badges_for(uuid[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.badges_for(uuid[]) FROM anon;
GRANT EXECUTE ON FUNCTION public.badges_for(uuid[]) TO authenticated;