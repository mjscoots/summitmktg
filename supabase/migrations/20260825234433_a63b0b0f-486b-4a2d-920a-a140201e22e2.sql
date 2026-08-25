DO $$
DECLARE r record;
  keep text[] := ARRAY[
    'get_public_counters','get_public_industry','get_public_fiber_stacks','get_recruiting_content',
    'get_recruiting_proof','get_ticket_config','get_ticket_series_status','validate_access_code',
    'resolve_source_code','get_current_season','get_public_calc','get_public_setting',
    'has_role','is_vertical_lead','is_vertical_lead_of_rep','region_lead_of','is_paired_manager_of','get_user_role'
  ];
  app_facing text[] := ARRAY[
    'get_badges_for_users','get_hall_of_fame','get_incentive_progress','get_team_battles'
  ];
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig, p.proname
      FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public'
       AND has_function_privilege('anon', p.oid, 'execute')
       AND NOT (p.proname = ANY(keep))
  LOOP
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC, anon', r.sig);
    IF r.proname = ANY(app_facing) THEN
      EXECUTE format('GRANT EXECUTE ON FUNCTION %s TO authenticated, service_role', r.sig);
    END IF;
  END LOOP;
END $$;