CREATE OR REPLACE FUNCTION public.is_first_week_eligible(_target uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = _target
      and coalesce(p.archived, false) = false
      and (
        public.has_role(_target, 'rookie')
        or (
          p.created_at > now() - interval '30 days'
          and not exists (select 1 from public.season_results s where s.user_id = _target)
        )
      )
  )
$$;

REVOKE ALL ON FUNCTION public.is_first_week_eligible(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_first_week_eligible(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.first_week_json(_target uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  _p record; _vert text; _start date; _dayn int; _days jsonb := '[]'::jsonb;
  _drec record; _out_items jsonb; _it jsonb; _rule text;
  _done boolean; _all_done boolean; _total int := 0; _done_cnt int := 0;
  _consec int := 0; _prev_ok boolean := true;
  _has_profile boolean; _msgs int; _threads int; _sales int; _open_events int;
begin
  select * into _p from public.profiles where user_id = _target;
  if not found then return jsonb_build_object('found', false); end if;
  if not public.is_first_week_eligible(_target) then return jsonb_build_object('found', false); end if;
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
end $function$;

CREATE OR REPLACE FUNCTION public.get_first_week_rows()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
    and public.is_first_week_eligible(p.user_id)
    and (
      _scope = 'all'
      or (_scope = 'vertical' and p.vertical = _vertical)
      or (_scope = 'downline' and p.user_id in (select uid from downline))
    );
  return _rows;
end $function$;

REVOKE ALL ON FUNCTION public.first_week_json(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.first_week_json(uuid) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.get_first_week_rows() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_first_week_rows() TO authenticated, service_role;