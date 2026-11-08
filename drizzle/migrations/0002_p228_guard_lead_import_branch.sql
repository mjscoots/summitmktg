DO $privacy$
DECLARE definition text;
BEGIN
 SELECT pg_get_functiondef('public.apply_leaderboard_import(uuid,jsonb)'::regprocedure) INTO definition;
 definition := replace(definition,'IF (r->>''kind'') = ''lead'' THEN','IF (r->>''kind'') = ''lead'' THEN' || E'\n      IF NOT public.has_role(auth.uid(), ''owner'') THEN skipped := skipped + 1; CONTINUE; END IF;');
 EXECUTE definition;
END $privacy$;