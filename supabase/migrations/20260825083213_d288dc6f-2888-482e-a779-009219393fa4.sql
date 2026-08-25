-- ============ weekly_reports ============
CREATE TABLE public.weekly_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_ending date NOT NULL UNIQUE,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  generated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.weekly_reports TO authenticated;
GRANT ALL ON public.weekly_reports TO service_role;

ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins and owners read weekly reports"
ON public.weekly_reports FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE TRIGGER update_weekly_reports_updated_at
BEFORE UPDATE ON public.weekly_reports
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ campaign spend setting (default empty = not set) ============
INSERT INTO public.app_settings (key, value)
VALUES ('command_campaign_spend', '')
ON CONFLICT (key) DO NOTHING;

-- ============ command analytics ============
CREATE OR REPLACE FUNCTION public.get_command_analytics()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  week_start_et timestamp := date_trunc('week', (now() AT TIME ZONE 'America/New_York'));
  w0 timestamptz := week_start_et AT TIME ZONE 'America/New_York';
  wm1 timestamptz := (week_start_et - interval '7 days') AT TIME ZONE 'America/New_York';
  funnel jsonb;
  wb jsonb;
  src jsonb;
  refs jsonb;
  spend text;
  signed_ticket int;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  -- Recruiting (non win-back) funnel: all time, this week cohort, last week cohort
  SELECT jsonb_build_object(
    'all_time', jsonb_build_object(
      'submitted', count(*),
      'claimed',   count(*) FILTER (WHERE claimed_by IS NOT NULL OR status <> 'New'),
      'contacted', count(*) FILTER (WHERE status IN ('Contacted','Booked','Signed')),
      'booked',    count(*) FILTER (WHERE status IN ('Booked','Signed')),
      'signed',    count(*) FILTER (WHERE status = 'Signed')
    ),
    'this_week', jsonb_build_object(
      'submitted', count(*) FILTER (WHERE created_at >= w0),
      'claimed',   count(*) FILTER (WHERE created_at >= w0 AND (claimed_by IS NOT NULL OR status <> 'New')),
      'contacted', count(*) FILTER (WHERE created_at >= w0 AND status IN ('Contacted','Booked','Signed')),
      'booked',    count(*) FILTER (WHERE created_at >= w0 AND status IN ('Booked','Signed')),
      'signed',    count(*) FILTER (WHERE created_at >= w0 AND status = 'Signed')
    ),
    'last_week', jsonb_build_object(
      'submitted', count(*) FILTER (WHERE created_at >= wm1 AND created_at < w0),
      'claimed',   count(*) FILTER (WHERE created_at >= wm1 AND created_at < w0 AND (claimed_by IS NOT NULL OR status <> 'New')),
      'contacted', count(*) FILTER (WHERE created_at >= wm1 AND created_at < w0 AND status IN ('Contacted','Booked','Signed')),
      'booked',    count(*) FILTER (WHERE created_at >= wm1 AND created_at < w0 AND status IN ('Booked','Signed')),
      'signed',    count(*) FILTER (WHERE created_at >= wm1 AND created_at < w0 AND status = 'Signed')
    )
  ) INTO funnel
  FROM public.recruiting_leads
  WHERE COALESCE(ref_code,'') <> 'winback';

  -- Win-back funnel (current pool state)
  SELECT jsonb_build_object(
    'pooled', count(*),
    'claimed', count(*) FILTER (WHERE claimed_by IS NOT NULL OR status IN ('Winback Claimed','Returning')),
    'contacted', count(*) FILTER (WHERE contact_count > 0 OR last_contact_at IS NOT NULL),
    'returning', count(*) FILTER (WHERE status = 'Returning')
  ) INTO wb
  FROM public.recruiting_leads
  WHERE COALESCE(ref_code,'') = 'winback';

  -- Source quality
  SELECT COALESCE(jsonb_agg(x ORDER BY x->>'source'), '[]'::jsonb) INTO src
  FROM (
    SELECT jsonb_build_object(
      'source', bucket,
      'leads', count(*),
      'signed', count(*) FILTER (WHERE status IN ('Signed','Returning'))
    ) AS x
    FROM (
      SELECT status,
        CASE COALESCE(ref_code,'')
          WHEN 'winback' THEN 'winback'
          WHEN 'pipeline-import' THEN 'pipeline-import'
          WHEN 'manual' THEN 'manual'
          ELSE 'ticket'
        END AS bucket
      FROM public.recruiting_leads
    ) b
    GROUP BY bucket
  ) agg;

  -- Signs per ref code (ticket-style codes only)
  SELECT COALESCE(jsonb_agg(jsonb_build_object('ref_code', rc, 'signed', n) ORDER BY n DESC, rc), '[]'::jsonb)
  INTO refs
  FROM (
    SELECT COALESCE(NULLIF(ref_code,''), 'direct') AS rc, count(*) AS n
    FROM public.recruiting_leads
    WHERE status = 'Signed'
      AND COALESCE(ref_code,'') NOT IN ('winback','pipeline-import','manual')
    GROUP BY 1
  ) r;

  SELECT count(*) INTO signed_ticket
  FROM public.recruiting_leads
  WHERE status = 'Signed' AND COALESCE(ref_code,'') NOT IN ('winback','pipeline-import','manual');

  SELECT NULLIF(btrim(COALESCE(value,'')), '') INTO spend
  FROM public.app_settings WHERE key = 'command_campaign_spend';

  RETURN jsonb_build_object(
    'funnel', funnel,
    'winback', wb,
    'sources', src,
    'ref_codes', refs,
    'signed_ticket', signed_ticket,
    'campaign_spend', spend,
    'week_start', w0
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_command_analytics() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_command_analytics() TO authenticated, service_role;

-- ============ weekly report computation ============
CREATE OR REPLACE FUNCTION public.compute_weekly_report(_from timestamptz, _to timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev_from timestamptz := _from - (_to - _from);
  signs int; returning_n int;
  fn jsonb; pf jsonb; wbact jsonb; risk jsonb;
  queue_open int;
BEGIN
  SELECT count(*) FILTER (WHERE status = 'Signed'),
         count(*) FILTER (WHERE status = 'Returning')
    INTO signs, returning_n
  FROM public.recruiting_leads
  WHERE COALESCE(last_activity_at, created_at) >= _from
    AND COALESCE(last_activity_at, created_at) < _to;

  -- funnel for the report week and the week before (cohort by submission date)
  SELECT jsonb_build_object(
      'submitted', count(*) FILTER (WHERE created_at >= _from AND created_at < _to),
      'claimed',   count(*) FILTER (WHERE created_at >= _from AND created_at < _to AND (claimed_by IS NOT NULL OR status <> 'New')),
      'contacted', count(*) FILTER (WHERE created_at >= _from AND created_at < _to AND status IN ('Contacted','Booked','Signed')),
      'booked',    count(*) FILTER (WHERE created_at >= _from AND created_at < _to AND status IN ('Booked','Signed')),
      'signed',    count(*) FILTER (WHERE created_at >= _from AND created_at < _to AND status = 'Signed')
    ),
    jsonb_build_object(
      'submitted', count(*) FILTER (WHERE created_at >= prev_from AND created_at < _from),
      'claimed',   count(*) FILTER (WHERE created_at >= prev_from AND created_at < _from AND (claimed_by IS NOT NULL OR status <> 'New')),
      'contacted', count(*) FILTER (WHERE created_at >= prev_from AND created_at < _from AND status IN ('Contacted','Booked','Signed')),
      'booked',    count(*) FILTER (WHERE created_at >= prev_from AND created_at < _from AND status IN ('Booked','Signed')),
      'signed',    count(*) FILTER (WHERE created_at >= prev_from AND created_at < _from AND status = 'Signed')
    )
    INTO fn, pf
  FROM public.recruiting_leads
  WHERE COALESCE(ref_code,'') <> 'winback';

  SELECT jsonb_build_object(
    'calls', count(*),
    'callers', count(DISTINCT user_id),
    'coming_back', count(*) FILTER (WHERE outcome = 'coming_back')
  ) INTO wbact
  FROM public.winback_contacts
  WHERE created_at >= _from AND created_at < _to;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'name', COALESCE(full_name, 'Unnamed rep'),
           'days', CASE WHEN last_active_at IS NULL THEN NULL
                        ELSE floor(EXTRACT(EPOCH FROM (_to - last_active_at)) / 86400)::int END
         ) ORDER BY last_active_at NULLS FIRST), '[]'::jsonb)
    INTO risk
  FROM (
    SELECT full_name, last_active_at
    FROM public.profiles
    WHERE archived = false
      AND approved = true
      AND COALESCE(status::text, '') NOT IN ('nlc','rejected','pending')
      AND (last_active_at IS NULL OR last_active_at < _to - interval '5 days')
    ORDER BY last_active_at NULLS FIRST
    LIMIT 30
  ) q;

  SELECT
    (SELECT count(*) FROM public.profiles p
      WHERE p.archived = false AND p.approved = false AND COALESCE(p.status::text,'') <> 'rejected'
        AND NOT EXISTS (SELECT 1 FROM public.admin_queue_dismissals d WHERE d.item_type = 'approval' AND d.item_key = p.id::text))
  + (SELECT count(*) FROM public.pitch_approval_requests r
      WHERE r.status = 'pending'
        AND NOT EXISTS (SELECT 1 FROM public.admin_queue_dismissals d WHERE d.item_type = 'pitch' AND d.item_key = r.id::text))
  + (SELECT count(*) FROM public.app_feedback f
      WHERE f.status = 'new'
        AND NOT EXISTS (SELECT 1 FROM public.admin_queue_dismissals d WHERE d.item_type = 'feedback' AND d.item_key = f.id::text))
  INTO queue_open;

  RETURN jsonb_build_object(
    'signs', COALESCE(signs,0),
    'returning', COALESCE(returning_n,0),
    'funnel', fn,
    'prev_funnel', pf,
    'winback', wbact,
    'risk', risk,
    'queue_open', COALESCE(queue_open,0),
    'window', jsonb_build_object('from', _from, 'to', _to)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.compute_weekly_report(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.compute_weekly_report(timestamptz, timestamptz) TO service_role;

-- ============ Sunday 6pm ET generation (idempotent) ============
CREATE OR REPLACE FUNCTION public.generate_weekly_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  now_et timestamp := (now() AT TIME ZONE 'America/New_York');
  week_start_et timestamp := date_trunc('week', now_et);
  cutoff_et timestamp := date_trunc('week', now_et) - interval '1 day' + interval '18 hours';
  target_week_end date;
  win_from timestamptz;
  win_to timestamptz;
  data jsonb;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('generated', false, 'reason', 'forbidden');
  END IF;

  IF now_et < cutoff_et THEN
    RETURN jsonb_build_object('generated', false, 'reason', 'before cutoff');
  END IF;

  target_week_end := (week_start_et - interval '1 day')::date;

  IF EXISTS (SELECT 1 FROM public.weekly_reports WHERE week_ending = target_week_end) THEN
    RETURN jsonb_build_object('generated', false, 'reason', 'already generated', 'week_ending', target_week_end);
  END IF;

  win_from := (week_start_et - interval '7 days') AT TIME ZONE 'America/New_York';
  win_to := cutoff_et AT TIME ZONE 'America/New_York';
  data := public.compute_weekly_report(win_from, win_to);

  INSERT INTO public.weekly_reports (week_ending, payload)
  VALUES (target_week_end, data)
  ON CONFLICT (week_ending) DO NOTHING;

  RETURN jsonb_build_object('generated', true, 'week_ending', target_week_end);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('generated', false, 'reason', 'already generated');
END;
$$;

REVOKE ALL ON FUNCTION public.generate_weekly_report() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.generate_weekly_report() TO authenticated, service_role;