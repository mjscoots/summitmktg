create table if not exists public.week_screen_views (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_opened_at timestamptz not null default now()
);

grant select, insert, update on public.week_screen_views to authenticated;
grant all on public.week_screen_views to service_role;

alter table public.week_screen_views enable row level security;

drop policy if exists "own week view" on public.week_screen_views;
create policy "own week view" on public.week_screen_views
  for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.mark_week_opened()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.week_screen_views (user_id, last_opened_at)
  values (auth.uid(), now())
  on conflict (user_id) do update set last_opened_at = now();
$$;

revoke all on function public.mark_week_opened() from public, anon;
grant execute on function public.mark_week_opened() to authenticated;

create or replace function public.get_manager_week(_manager uuid default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  _uid uuid := coalesce(auth.uid(), _manager);
  _scope text;
  _vertical text;
  _seen timestamptz;
  _rows jsonb := '[]'::jsonb;
  _monday date := (date_trunc('week', (now() at time zone 'America/Los_Angeles'))::date);
begin
  if _uid is null then
    return jsonb_build_object('scope', 'none', 'rows', '[]'::jsonb);
  end if;
  -- callers may only ask for their own week unless they are staff
  if _manager is not null and auth.uid() is not null and _manager <> auth.uid()
     and not (public.has_role(auth.uid(), 'admin') or public.has_role(auth.uid(), 'owner')) then
    return jsonb_build_object('scope', 'none', 'rows', '[]'::jsonb);
  end if;
  _uid := coalesce(_manager, auth.uid());

  if public.has_role(_uid, 'owner') or public.has_role(_uid, 'admin') then
    _scope := 'all';
  elsif public.has_role(_uid, 'president') then
    _scope := 'vertical';
    select p.vertical into _vertical from public.profiles p where p.user_id = _uid;
  elsif public.has_role(_uid, 'manager') then
    _scope := 'downline';
  else
    return jsonb_build_object('scope', 'none', 'rows', '[]'::jsonb);
  end if;

  select last_opened_at into _seen from public.week_screen_views where user_id = _uid;

  with recursive downline as (
    select e.child_user_id as uid, 1 as lvl
    from public.downline_edges e
    where e.parent_user_id = _uid and e.edge_type = 'manages'
    union all
    select e.child_user_id, d.lvl + 1
    from public.downline_edges e
    join downline d on e.parent_user_id = d.uid
    where e.edge_type = 'manages' and d.lvl < 10
  ),
  people as (
    select p.user_id, p.full_name, p.avatar_url, p.team_id, p.vertical, p.last_active_at
    from public.profiles p
    where coalesce(p.archived, false) = false
      and coalesce(p.status::text, 'active') <> 'nlc'
      and p.user_id <> _uid
      and (
        _scope = 'all'
        or (_scope = 'vertical' and p.vertical = _vertical)
        or (_scope = 'downline' and p.user_id in (select uid from downline))
      )
  ),
  sales as (
    select s.user_id,
           count(*) filter (where s.sold_at >= _monday) as wk,
           count(*) filter (where s.sold_at >= _monday - 21 and s.sold_at < _monday - 14) as w1,
           count(*) filter (where s.sold_at >= _monday - 14 and s.sold_at < _monday - 7) as w2,
           count(*) filter (where s.sold_at >= _monday - 7 and s.sold_at < _monday) as w3
    from public.sales_log s
    where s.user_id in (select user_id from people) and s.sold_at >= _monday - 21
    group by s.user_id
  ),
  mins as (
    select d.user_id,
           coalesce(sum(d.training_minutes) filter (where d.date >= _monday), 0) as this_week,
           coalesce(sum(d.training_minutes) filter (where d.date >= _monday - 7 and d.date < _monday), 0) as prev_week
    from public.daily_training_time d
    where d.user_id in (select user_id from people) and d.date >= _monday - 7
    group by d.user_id
  )
  select coalesce(jsonb_agg(r order by r.needs_attention desc, r.team_name nulls last, r.full_name), '[]'::jsonb)
  into _rows
  from (
    select
      pe.user_id,
      pe.full_name,
      pe.avatar_url,
      t.name as team_name,
      pe.vertical,
      pe.last_active_at,
      coalesce(sa.wk, 0)::int as sales_week,
      jsonb_build_array(coalesce(sa.w1,0)::int, coalesce(sa.w2,0)::int, coalesce(sa.w3,0)::int, coalesce(sa.wk,0)::int) as sales_4w,
      coalesce(mi.this_week, 0)::int as training_week,
      coalesce(mi.prev_week, 0)::int as training_prev,
      (select count(*) from public.calendar_events e
        where coalesce(e.is_cancelled,false) = false
          and e.event_date >= now()
          and (e.rsvp_deadline is null or e.rsvp_deadline >= now())
          and (e.rsvp_deadline is not null or e.event_date <= now() + interval '14 days')
          and public.can_view_event(e.scope, e.team_id, pe.user_id)
          and not exists (select 1 from public.calendar_attendance a where a.event_id = e.id and a.user_id = pe.user_id)
      )::int as open_rsvps,
      (select count(*) from public.calendar_events e
        where coalesce(e.is_cancelled,false) = false
          and e.event_date >= now()
          and e.rsvp_deadline is not null and e.rsvp_deadline < now()
          and public.can_view_event(e.scope, e.team_id, pe.user_id)
          and not exists (select 1 from public.calendar_attendance a where a.event_id = e.id and a.user_id = pe.user_id)
      )::int as late_rsvps,
      split_part(coalesce(ap.summary, ''), '.', 1) as summary_line,
      coalesce(ap.concerns, '[]'::jsonb) as concerns,
      ap.goals,
      ap.last_built_at as profile_built_at,
      (select s.title from public.vertical_steps s
        where s.vertical = pe.vertical and s.is_active
          and not exists (select 1 from public.vertical_step_completions c
                           where c.user_id = pe.user_id and c.step_id = s.id)
        order by s.display_order limit 1) as setup_step,
      (
        (coalesce(sa.wk,0) = 0 and coalesce(mi.this_week,0) = 0)
        or pe.last_active_at is null
        or pe.last_active_at < now() - interval '3 days'
        or (select count(*) from public.calendar_events e
             where coalesce(e.is_cancelled,false) = false
               and e.event_date >= now()
               and e.rsvp_deadline is not null and e.rsvp_deadline < now()
               and public.can_view_event(e.scope, e.team_id, pe.user_id)
               and not exists (select 1 from public.calendar_attendance a where a.event_id = e.id and a.user_id = pe.user_id)) > 0
        or (_seen is not null and ap.last_built_at is not null and ap.last_built_at > _seen
            and jsonb_array_length(coalesce(ap.concerns, '[]'::jsonb)) > 0)
      ) as needs_attention
    from people pe
    left join public.teams t on t.id = pe.team_id
    left join sales sa on sa.user_id = pe.user_id
    left join mins mi on mi.user_id = pe.user_id
    left join public.rep_ai_profiles ap on ap.user_id = pe.user_id
  ) r;

  return jsonb_build_object(
    'scope', _scope,
    'week_start', _monday,
    'last_opened_at', _seen,
    'rows', _rows
  );
end;
$$;

revoke all on function public.get_manager_week(uuid) from public, anon;
grant execute on function public.get_manager_week(uuid) to authenticated, service_role;