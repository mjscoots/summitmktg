CREATE OR REPLACE FUNCTION public.get_first_week_rows()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
declare _uid uuid := auth.uid(); _scope text; _vertical text; _rows jsonb := '[]'::jsonb;
begin
  if _uid is null then return '[]'::jsonb; end if;
  if public.has_role(_uid,'owner') or public.has_role(_uid,'admin') then _scope := 'all';
  elsif public.has_role(_uid,'president') then
    _scope := 'vertical';
    select p.vertical into _vertical from public.profiles p where p.user_id = _uid;
  elsif public.has_role(_uid,'manager') then _scope := 'downline';
  else return '[]'::jsonb; end if;

  with recursive downline as (
    select e.child_user_id as uid, 1 as lvl from public.downline_edges e
    where e.parent_user_id = _uid and e.edge_type = 'manages'
    union all
    select e.child_user_id, d.lvl + 1 from public.downline_edges e
    join downline d on e.parent_user_id = d.uid
    where e.edge_type = 'manages' and d.lvl < 10
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', p.user_id, 'week', public.first_week_json(p.user_id))), '[]'::jsonb)
  into _rows
  from public.profiles p
  where coalesce(p.archived,false) = false
    and p.user_id <> _uid
    and (
      public.has_role(p.user_id, 'rookie')
      or not exists (select 1 from public.user_roles r where r.user_id = p.user_id)
    )
    and (
      _scope = 'all'
      or (_scope = 'vertical' and p.vertical = _vertical)
      or (_scope = 'downline' and p.user_id in (select uid from downline))
    );
  return _rows;
end $$;

REVOKE ALL ON FUNCTION public.get_first_week_rows() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_first_week_rows() TO authenticated, service_role;