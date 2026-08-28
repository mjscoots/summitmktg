create or replace function public.my_next_year_pay()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cur int;
  nxt int;
  so int;
  res jsonb;
begin
  if uid is null then
    raise exception 'Not signed in';
  end if;

  select coalesce(nullif(regexp_replace(coalesce(p.rep_year, ''), '\D', '', 'g'), '')::int, 1)
    into cur
  from public.profiles p
  where p.user_id = uid;

  cur := greatest(coalesce(cur, 1), 1);
  nxt := least(cur + 1, 9);
  so := least(nxt, 4);

  select jsonb_build_object(
    'current_year', cur,
    'next_year', nxt,
    'tier_sort_order', so,
    'tier_name', (select r.name from public.ranks r where r.sort_order = so limit 1),
    'rows', coalesce((
      select jsonb_agg(jsonb_build_object('carrier', c.name, 'value', s.value) order by c.name)
      from public.rank_stacks s
      join public.ranks r on r.id = s.rank_id
      join public.carriers c on c.id = s.carrier_id
      where s.vertical = 'Fiber'
        and r.sort_order = so
        and s.confirmed is true
        and s.value is not null
    ), '[]'::jsonb)
  ) into res;

  return res;
end
$$;

revoke all on function public.my_next_year_pay() from public;
revoke all on function public.my_next_year_pay() from anon;
grant execute on function public.my_next_year_pay() to authenticated;