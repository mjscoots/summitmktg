CREATE OR REPLACE FUNCTION public.lead_log(_lead uuid, _kind text, _outcome text DEFAULT NULL::text, _body text DEFAULT NULL::text, _next_call_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _tier text := public.user_tier(auth.uid()); _l public.people_leads; _stage text;
BEGIN
  IF _tier = 'sales' THEN RAISE EXCEPTION 'Not permitted'; END IF;
  IF _kind NOT IN ('call','text','note','stage','designation','restore') THEN
    RAISE EXCEPTION 'Unknown activity kind %', _kind;
  END IF;
  SELECT * INTO _l FROM public.people_leads WHERE id = _lead;
  IF _l.id IS NULL THEN RAISE EXCEPTION 'Lead not found'; END IF;
  IF _tier = 'manager' AND NOT (
      _l.designated_to = auth.uid() OR _l.claimed_by = auth.uid() OR _l.designation_status = 'free'
    ) THEN RAISE EXCEPTION 'Not permitted'; END IF;

  _stage := CASE _outcome
    WHEN 'called' THEN 'contacted'
    WHEN 'texted' THEN 'contacted'
    WHEN 'no_answer' THEN 'contacted'
    WHEN 'meeting_set' THEN 'interested'
    WHEN 'not_coming_back' THEN 'dead'
    WHEN 'callback' THEN 'callback'
    WHEN 'interested' THEN 'interested'
    WHEN 'not_interested' THEN 'not_interested'
    WHEN 'signed' THEN 'signed'
    WHEN 'wrong_number' THEN 'dead'
    WHEN 'do_not_call' THEN 'dead'
    ELSE NULL END;

  INSERT INTO public.lead_activities (lead_id, actor_id, kind, outcome, body, next_call_at)
  VALUES (_lead, auth.uid(), _kind, _outcome, _body, _next_call_at);

  UPDATE public.people_leads
     SET last_contact_at = CASE WHEN _kind IN ('call','text') THEN now() ELSE last_contact_at END,
         call_count = call_count + CASE WHEN _kind = 'call' THEN 1 ELSE 0 END,
         next_call_at = COALESCE(_next_call_at, next_call_at),
         stage = COALESCE(_stage, stage),
         signed_2027 = CASE WHEN _outcome = 'signed' THEN true ELSE signed_2027 END,
         do_not_call = CASE WHEN _outcome IN ('do_not_call','wrong_number') THEN true ELSE do_not_call END,
         updated_at = now()
   WHERE id = _lead;
END;
$function$;

CREATE OR REPLACE FUNCTION public.leads_counts()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT CASE
    WHEN public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
      OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'president')
    THEN jsonb_build_object(
      'out', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND roster_status = 'out'),
      'pool', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND designated_to IS NULL),
      'designated', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND designated_to IS NOT NULL),
      'signed_2027', (SELECT count(*) FROM public.people_leads WHERE bucket = 'lead' AND signed_2027),
      'signed_count', (SELECT count(*) FROM public.people_leads WHERE signed_2027),
      'signed_revenue', (SELECT COALESCE(sum(season_revenue), 0) FROM public.people_leads WHERE signed_2027),
      'unsigned_count', (SELECT count(*) FROM public.people_leads WHERE COALESCE(signed_2027, false) = false),
      'unsigned_revenue', (SELECT COALESCE(sum(season_revenue), 0) FROM public.people_leads WHERE COALESCE(signed_2027, false) = false)
    )
    ELSE jsonb_build_object('out', 0, 'pool', 0, 'designated', 0, 'signed_2027', 0,
      'signed_count', 0, 'signed_revenue', 0, 'unsigned_count', 0, 'unsigned_revenue', 0)
  END
$function$;