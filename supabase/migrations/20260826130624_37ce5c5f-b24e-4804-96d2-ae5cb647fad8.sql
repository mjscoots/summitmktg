do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure::text as sig
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and pg_get_function_result(p.oid) = 'trigger'
  loop
    execute format('revoke execute on function %s from anon, authenticated, PUBLIC', r.sig);
  end loop;
end $$;