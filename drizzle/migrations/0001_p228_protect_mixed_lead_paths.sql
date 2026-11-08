DO $privacy$
DECLARE definition text;
BEGIN
 -- Revenue matching still offers profile candidates to staff, but never private contact candidates.
 SELECT pg_get_functiondef('public.match_leaderboard_rows(jsonb)'::regprocedure) INTO definition;
 definition := replace(definition,'FROM recruiting_leads l','FROM recruiting_leads l');
 definition := replace(definition,'WHERE nm <> ''''','WHERE public.has_role(auth.uid(), ''owner'') AND nm <> ''''');
 EXECUTE definition;
 -- Revenue imports cannot mutate private recruiting contacts for non-owners.
 SELECT pg_get_functiondef('public.apply_leaderboard_import(uuid,jsonb)'::regprocedure) INTO definition;
 definition := replace(definition,'UPDATE recruiting_leads SET','UPDATE recruiting_leads SET');
 definition := replace(definition,'WHERE id = _id','WHERE public.has_role(auth.uid(), ''owner'') AND id = _id');
 EXECUTE definition;
END $privacy$;