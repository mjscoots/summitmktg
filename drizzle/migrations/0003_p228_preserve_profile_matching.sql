DO $privacy$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.match_leaderboard_rows(jsonb)'::regprocedure) INTO definition;
 definition := replace(definition,'WHERE public.has_role(auth.uid(), ''owner'') AND nm <> '''' AND extensions.similarity(public.norm_person_name(p.full_name)', 'WHERE nm <> '''' AND extensions.similarity(public.norm_person_name(p.full_name)');
 EXECUTE definition;
END $privacy$;