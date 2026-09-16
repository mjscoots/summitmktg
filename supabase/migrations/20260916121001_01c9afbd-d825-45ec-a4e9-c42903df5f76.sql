CREATE OR REPLACE FUNCTION public.lead_detail(_lead uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads; _out jsonb;
BEGIN
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _l.bucket <> 'lead' THEN RAISE EXCEPTION 'Not permitted'; END IF;

  IF _tier = 'sales' AND NOT (_l.designated_to = auth.uid() OR _l.claimed_by = auth.uid()) THEN
    RAISE EXCEPTION 'Not permitted';
  END IF;
  IF _tier = 'manager' AND NOT (
      _l.designated_to = auth.uid() OR _l.claimed_by = auth.uid() OR _l.designation_status = 'free'
    ) THEN RAISE EXCEPTION 'Not permitted'; END IF;

  _out := jsonb_build_object(
    'lead', CASE WHEN _tier IN ('manager','admin','owner')
              THEN to_jsonb(_l)
              ELSE to_jsonb(_l) - 'sheet_row' END,
    'designated_to_name', (SELECT full_name FROM public.profiles WHERE user_id = _l.designated_to),
    'designated_has_access', (_l.designated_to IS NOT NULL AND EXISTS (
        SELECT 1 FROM public.profiles x WHERE x.user_id = _l.designated_to AND x.approved AND NOT x.archived)),
    'profile', (SELECT jsonb_build_object('id', p.id, 'user_id', p.user_id, 'full_name', p.full_name,
                        'approved', p.approved, 'archived', p.archived, 'status', p.status,
                        'revenue_to_date', p.revenue_to_date, 'last_sweep_at', p.last_sweep_at)
                FROM public.profiles p WHERE p.id = _l.profile_id),
    'activities', COALESCE((SELECT jsonb_agg(jsonb_build_object(
                        'id', a.id, 'kind', a.kind, 'outcome', a.outcome, 'body', a.body,
                        'next_call_at', a.next_call_at, 'created_at', a.created_at,
                        'actor_name', (SELECT full_name FROM public.profiles WHERE user_id = a.actor_id))
                      ORDER BY a.created_at DESC)
                    FROM public.lead_activities a WHERE a.lead_id = _lead), '[]'::jsonb),
    'private_notes', CASE WHEN _tier IN ('manager','admin','owner') THEN
        COALESCE((SELECT jsonb_agg(jsonb_build_object('id', n.id, 'kind', n.kind, 'body', n.body,
                    'created_at', n.created_at,
                    'author_name', (SELECT full_name FROM public.profiles WHERE user_id = n.author_id))
                  ORDER BY n.created_at DESC)
                  FROM public.lead_private_notes n WHERE n.lead_id = _lead), '[]'::jsonb)
      ELSE NULL END
  );
  RETURN _out;
END;
$function$;

CREATE OR REPLACE FUNCTION public.lead_tag_options()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tier text := public.user_tier(auth.uid()); _out jsonb;
BEGIN
  IF _tier NOT IN ('manager','admin','owner') THEN
    RETURN jsonb_build_object('total', 0, 'tags', '[]'::jsonb);
  END IF;

  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead'),
    'tags', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('tag', t.tag, 'count', t.n) ORDER BY t.tag)
      FROM (
        SELECT tg AS tag, count(*) AS n
        FROM public.people_leads l, unnest(l.tags) tg
        WHERE l.bucket = 'lead'
        GROUP BY tg
      ) t
    ), '[]'::jsonb)
  ) INTO _out;

  RETURN _out;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.lead_tag_options() TO authenticated;