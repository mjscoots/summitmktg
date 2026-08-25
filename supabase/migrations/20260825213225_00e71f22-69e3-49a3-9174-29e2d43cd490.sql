DO $$
BEGIN
  EXECUTE 'SET LOCAL ROLE authenticated';
  PERFORM public.has_role(gen_random_uuid(), 'rookie'::public.app_role);
  EXECUTE 'RESET ROLE';

  EXECUTE 'SET LOCAL ROLE anon';
  PERFORM public.has_role(gen_random_uuid(), 'rookie'::public.app_role);
  EXECUTE 'RESET ROLE';
END $$;