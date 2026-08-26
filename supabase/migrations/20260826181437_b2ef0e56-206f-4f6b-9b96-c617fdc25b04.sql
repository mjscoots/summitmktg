create table if not exists public.onboarding_days (
  id uuid primary key default gen_random_uuid(),
  vertical text not null,
  day int not null check (day between 1 and 7),
  title text not null,
  items jsonb not null default '[]'::jsonb,
  published boolean not null default true,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (vertical, day)
);

grant select, insert, update, delete on public.onboarding_days to authenticated;
grant all on public.onboarding_days to service_role;
alter table public.onboarding_days enable row level security;

create policy "onboarding_days_read" on public.onboarding_days for select to authenticated using (true);
create policy "onboarding_days_write" on public.onboarding_days for all to authenticated
  using (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'))
  with check (public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));

create table if not exists public.onboarding_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  day int not null,
  item_key text not null,
  marked_by uuid,
  marked_at timestamptz not null default now(),
  unique (user_id, day, item_key)
);

grant select on public.onboarding_marks to authenticated;
grant all on public.onboarding_marks to service_role;
alter table public.onboarding_marks enable row level security;

create policy "onboarding_marks_read" on public.onboarding_marks for select to authenticated
  using (user_id = auth.uid()
    or public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'president')
    or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner'));

insert into public.onboarding_days (vertical, day, title, items) values
('Pest', 1, 'Set up and say hello', '[
  {"key":"profile","label":"Add a profile photo and set your phone visibility","rule":"profile","link":"/app/profile"},
  {"key":"hello","label":"Join team chat and say hello","rule":"chat_message","link":"/app/chat"},
  {"key":"script13","label":"Read Script sections 1 to 3 in the Playbook","rule":"self","link":"/app/playbook"}
]'::jsonb),
('Pest', 2, 'Finish the script', '[
  {"key":"script47","label":"Read Script sections 4 to 7 in the Playbook","rule":"self","link":"/app/playbook"},
  {"key":"obj3","label":"Drill the first three objections","rule":"drills:Objections:3","link":"/app/training"}
]'::jsonb),
('Pest', 3, 'The rest of the objections', '[
  {"key":"obj9","label":"Drill the remaining objections","rule":"drills:Objections:9","link":"/app/training"},
  {"key":"practice2","label":"Use Practice this in Ask Summit twice","rule":"threads:2","link":"/app/ask-summit"}
]'::jsonb),
('Pest', 4, 'Closes', '[
  {"key":"closes6","label":"Drill the six closes","rule":"drills:Closes:6","link":"/app/training"},
  {"key":"backyard","label":"Read the backyard talk track","rule":"self","link":"/app/playbook"}
]'::jsonb),
('Pest', 5, 'Out on the doors', '[
  {"key":"firstsale","label":"Log your first sale, or your first day out with your manager","rule":"sale","mark":"manager","link":"/app/dashboard"}
]'::jsonb),
('Pest', 6, 'Pricing and answers', '[
  {"key":"pricing","label":"Drill the pricing sheet in the Playbook","rule":"self","link":"/app/playbook"},
  {"key":"events","label":"Answer every open event card","rule":"events_clear","link":"/app/events"}
]'::jsonb),
('Pest', 7, '1:1 with your manager', '[
  {"key":"one_on_one","label":"1:1 with your manager","rule":"mark","mark":"manager","link":"/app/one-on-ones/prep"}
]'::jsonb)
on conflict (vertical, day) do nothing;

insert into public.vertical_steps (vertical, display_order, title, description, step_type, is_active, auto_rule, overdue_days)
select 'Pest', coalesce((select max(display_order) from public.vertical_steps where vertical='Pest'), 0) + 1,
       'First week', 'The seven day first week plan', 'task', true, 'first_week', 7
where not exists (select 1 from public.vertical_steps where vertical='Pest' and title='First week');

create or replace function public.first_week_json(_target uuid)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  _p record; _vert text; _start date; _dayn int; _days jsonb := '[]'::jsonb;
  _drec record; _out_items jsonb; _it jsonb; _rule text;
  _done boolean; _all_done boolean; _total int := 0; _done_cnt int := 0;
  _consec int := 0; _prev_ok boolean := true;
  _has_profile boolean; _msgs int; _threads int; _sales int; _open_events int;
begin
  select * into _p from public.profiles where user_id = _target;
  if not found then return jsonb_build_object('found', false); end if;
  _vert := coalesce(_p.active_vertical, _p.vertical, 'Pest');
  _start := coalesce(_p.showed_up_date, _p.created_at::date);
  _dayn := least(7, greatest(1, (current_date - _start) + 1));
  _has_profile := _p.avatar_url is not null and _p.phone_visibility is not null;
  select count(*) into _msgs from public.chat_messages where user_id = _target;
  select count(*) into _threads from public.assistant_threads where user_id = _target;
  select count(*) into _sales from public.sales_log where user_id = _target;
  select count(*) into _open_events from public.calendar_events e
    where coalesce(e.is_cancelled,false) = false
      and e.event_date >= now()
      and (e.rsvp_deadline is null or e.rsvp_deadline >= now())
      and (e.rsvp_deadline is not null or e.event_date <= now() + interval '14 days')
      and public.can_view_event(e.scope, e.team_id, _target)
      and not exists (select 1 from public.calendar_attendance a where a.event_id = e.id and a.user_id = _target);

  for _drec in select day, title, items from public.onboarding_days
               where vertical = _vert and published order by day loop
    _out_items := '[]'::jsonb; _all_done := true;
    for _it in select value from jsonb_array_elements(_drec.items) loop
      _rule := coalesce(_it->>'rule','self');
      _done := exists (select 1 from public.onboarding_marks m
                       where m.user_id = _target and m.day = _drec.day and m.item_key = _it->>'key');
      if not _done then
        if _rule = 'profile' then _done := _has_profile;
        elsif _rule = 'chat_message' then _done := _msgs > 0;
        elsif _rule = 'sale' then _done := _sales > 0;
        elsif _rule = 'events_clear' then _done := _open_events = 0;
        elsif _rule like 'threads:%' then _done := _threads >= (split_part(_rule,':',2))::int;
        elsif _rule like 'drills:%' then
          _done := (select count(distinct dc.drill_id) from public.drill_completions dc
                    join public.training_drills d on d.id = dc.drill_id
                    where dc.user_id = _target and d.category = split_part(_rule,':',2))
                   >= (split_part(_rule,':',3))::int;
        end if;
      end if;
      _total := _total + 1;
      if _done then _done_cnt := _done_cnt + 1; else _all_done := false; end if;
      _out_items := _out_items || jsonb_build_array(_it || jsonb_build_object('done', _done));
    end loop;
    if _all_done and _prev_ok then _consec := _drec.day; else _prev_ok := false; end if;
    _days := _days || jsonb_build_array(jsonb_build_object(
      'day', _drec.day, 'title', _drec.title, 'items', _out_items, 'complete', _all_done));
  end loop;

  return jsonb_build_object(
    'found', true, 'vertical', _vert, 'start_date', _start, 'day_number', _dayn,
    'days', _days, 'total', _total, 'done', _done_cnt,
    'complete', (_total > 0 and _done_cnt = _total),
    'behind_days', greatest(0, _dayn - _consec));
end $$;

create or replace function public.get_first_week(_target uuid default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare _who uuid := coalesce(_target, auth.uid());
begin
  if auth.uid() is null then return jsonb_build_object('found', false); end if;
  if _who <> auth.uid()
     and not (public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'president')
              or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner')) then
    return jsonb_build_object('found', false);
  end if;
  return public.first_week_json(_who);
end $$;

create or replace function public.get_first_week_rows()
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
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
    and public.has_role(p.user_id, 'rookie')
    and (
      _scope = 'all'
      or (_scope = 'vertical' and p.vertical = _vertical)
      or (_scope = 'downline' and p.user_id in (select uid from downline))
    );
  return _rows;
end $$;

create or replace function public.mark_first_week_item(_user uuid, _day int, _key text, _on boolean default true)
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare _vert text; _item jsonb; _rule text; _mark text; _is_staff boolean;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  select coalesce(p.active_vertical, p.vertical, 'Pest') into _vert from public.profiles p where p.user_id = _user;
  select value into _item
    from public.onboarding_days d, jsonb_array_elements(d.items) value
    where d.vertical = _vert and d.day = _day and value->>'key' = _key;
  if _item is null then raise exception 'Unknown first week item'; end if;
  _rule := coalesce(_item->>'rule','self');
  _mark := _item->>'mark';
  _is_staff := public.has_role(auth.uid(),'manager') or public.has_role(auth.uid(),'president')
            or public.has_role(auth.uid(),'admin') or public.has_role(auth.uid(),'owner');
  if _mark = 'manager' or _rule = 'mark' then
    if not _is_staff then raise exception 'Only a manager can mark this'; end if;
  elsif _rule = 'self' then
    if _user <> auth.uid() and not _is_staff then raise exception 'Not allowed'; end if;
  else
    raise exception 'This item completes on its own';
  end if;

  if _on then
    insert into public.onboarding_marks (user_id, day, item_key, marked_by)
    values (_user, _day, _key, auth.uid())
    on conflict (user_id, day, item_key) do nothing;
  else
    delete from public.onboarding_marks where user_id = _user and day = _day and item_key = _key;
  end if;
  return public.first_week_json(_user);
end $$;

create or replace function public.finish_first_week()
returns jsonb language plpgsql security definer set search_path to 'public' as $$
declare _uid uuid := auth.uid(); _week jsonb; _step record; _mgr uuid; _name text; _vert text;
begin
  if _uid is null then return jsonb_build_object('recorded', false); end if;
  _week := public.first_week_json(_uid);
  if coalesce((_week->>'complete')::boolean, false) is not true then
    return jsonb_build_object('recorded', false);
  end if;
  _vert := _week->>'vertical';
  select id, vertical into _step from public.vertical_steps
    where vertical = _vert and title = 'First week' and is_active limit 1;
  if not found then return jsonb_build_object('recorded', false); end if;
  if exists (select 1 from public.vertical_step_completions c where c.user_id = _uid and c.step_id = _step.id) then
    return jsonb_build_object('recorded', true, 'new', false);
  end if;
  insert into public.vertical_step_completions (user_id, vertical, step_id, completed_at)
  values (_uid, _vert, _step.id, now());
  select p.direct_manager, p.full_name into _mgr, _name from public.profiles p where p.user_id = _uid;
  if _mgr is not null then
    insert into public.user_notifications (user_id, title, message, link)
    values (_mgr, 'First week done', coalesce(_name,'A rep') || ' finished the first week plan', '/app/week');
  end if;
  return jsonb_build_object('recorded', true, 'new', true);
end $$;

revoke all on function public.first_week_json(uuid) from public, anon;
revoke all on function public.get_first_week(uuid) from public, anon;
revoke all on function public.get_first_week_rows() from public, anon;
revoke all on function public.mark_first_week_item(uuid, int, text, boolean) from public, anon;
revoke all on function public.finish_first_week() from public, anon;
grant execute on function public.get_first_week(uuid) to authenticated, service_role;
grant execute on function public.get_first_week_rows() to authenticated, service_role;
grant execute on function public.mark_first_week_item(uuid, int, text, boolean) to authenticated, service_role;
grant execute on function public.finish_first_week() to authenticated, service_role;
grant execute on function public.first_week_json(uuid) to authenticated, service_role;