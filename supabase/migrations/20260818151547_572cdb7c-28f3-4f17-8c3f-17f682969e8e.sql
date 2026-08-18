
-- ============ TABLES ============
CREATE TABLE public.recruiting_ref_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text,
  assigned_user_id uuid,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recruiting_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL CHECK (char_length(first_name) BETWEEN 1 AND 80),
  phone text NOT NULL CHECK (char_length(phone) BETWEEN 7 AND 30),
  city text CHECK (city IS NULL OR char_length(city) <= 80),
  interest_reason text CHECK (interest_reason IS NULL OR char_length(interest_reason) <= 60),
  ref_code text CHECK (ref_code IS NULL OR char_length(ref_code) <= 40),
  status text NOT NULL DEFAULT 'New' CHECK (status IN ('New','Claimed','Contacted','Booked','Signed','Dead')),
  claimed_by uuid,
  claimed_at timestamptz,
  last_activity_at timestamptz,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_recruiting_leads_status ON public.recruiting_leads(status);
CREATE INDEX idx_recruiting_leads_claimed_by ON public.recruiting_leads(claimed_by);

-- ============ GRANTS ============
GRANT INSERT ON public.recruiting_leads TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiting_leads TO authenticated;
GRANT ALL ON public.recruiting_leads TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recruiting_ref_codes TO authenticated;
GRANT ALL ON public.recruiting_ref_codes TO service_role;

-- ============ RLS ============
ALTER TABLE public.recruiting_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recruiting_ref_codes ENABLE ROW LEVEL SECURITY;

-- Public golden-ticket submissions (must land as unclaimed New leads)
CREATE POLICY "Anyone can submit a lead"
ON public.recruiting_leads FOR INSERT TO anon, authenticated
WITH CHECK (status = 'New' AND claimed_by IS NULL);

CREATE POLICY "Admins can read all leads"
ON public.recruiting_leads FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can update all leads"
ON public.recruiting_leads FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Admins can delete leads"
ON public.recruiting_leads FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Authenticated can read ref codes"
ON public.recruiting_ref_codes FOR SELECT TO authenticated
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins manage ref codes"
ON public.recruiting_ref_codes FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

-- ============ PUBLIC TICKET CONFIG ============
INSERT INTO public.app_settings (key, value)
VALUES ('recruiting_calendly_url', '')
ON CONFLICT (key) DO NOTHING;

CREATE OR REPLACE FUNCTION public.get_ticket_config()
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'calendly_url', COALESCE((SELECT value FROM app_settings WHERE key = 'recruiting_calendly_url'), '')
  );
$$;
REVOKE ALL ON FUNCTION public.get_ticket_config() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ticket_config() TO anon, authenticated;

-- ============ AUTO-RELEASE ============
CREATE OR REPLACE FUNCTION public.release_stale_leads()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    UPDATE recruiting_leads
    SET status = 'New', claimed_by = NULL, claimed_at = NULL, last_activity_at = NULL
    WHERE status IN ('Claimed','Contacted')
      AND COALESCE(last_activity_at, claimed_at) < now() - interval '48 hours'
    RETURNING first_name, claimed_by AS old_owner, id
  LOOP
    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;

-- Needs the previous owner, so do the release row-by-row with notifications
CREATE OR REPLACE FUNCTION public.release_stale_leads()
RETURNS integer
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT id, first_name, claimed_by
    FROM recruiting_leads
    WHERE status IN ('Claimed','Contacted')
      AND COALESCE(last_activity_at, claimed_at) < now() - interval '48 hours'
    FOR UPDATE
  LOOP
    UPDATE recruiting_leads
    SET status = 'New', claimed_by = NULL, claimed_at = NULL, last_activity_at = NULL
    WHERE id = r.id;

    IF r.claimed_by IS NOT NULL THEN
      INSERT INTO user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Lead released',
              'You lost ' || r.first_name || ' — no activity in 48 hours.',
              '/app/recruits');
    END IF;

    n := n + 1;
  END LOOP;
  RETURN n;
END;
$$;
REVOKE ALL ON FUNCTION public.release_stale_leads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_stale_leads() TO authenticated;

-- ============ REP FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.get_lead_board()
RETURNS TABLE(id uuid, first_name text, city text, interest_reason text, ref_code text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.first_name, l.city, l.interest_reason, l.ref_code, l.created_at
  FROM recruiting_leads l
  WHERE auth.uid() IS NOT NULL
    AND l.status = 'New' AND l.claimed_by IS NULL
  ORDER BY l.created_at DESC
  LIMIT 300;
$$;
REVOKE ALL ON FUNCTION public.get_lead_board() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_lead_board() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_my_leads()
RETURNS TABLE(id uuid, first_name text, phone text, city text, interest_reason text, ref_code text,
              status text, claimed_at timestamptz, last_activity_at timestamptz, notes text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT l.id, l.first_name, l.phone, l.city, l.interest_reason, l.ref_code,
         l.status, l.claimed_at, l.last_activity_at, l.notes, l.created_at
  FROM recruiting_leads l
  WHERE auth.uid() IS NOT NULL AND l.claimed_by = auth.uid()
  ORDER BY l.claimed_at DESC NULLS LAST
  LIMIT 300;
$$;
REVOKE ALL ON FUNCTION public.get_my_leads() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_leads() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_new_lead_count()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN 0 ELSE
    (SELECT count(*)::int FROM recruiting_leads WHERE status = 'New' AND claimed_by IS NULL) END;
$$;
REVOKE ALL ON FUNCTION public.get_new_lead_count() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_new_lead_count() TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_lead(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _active int;
  _row recruiting_leads;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT count(*) INTO _active FROM recruiting_leads
  WHERE claimed_by = _uid AND status IN ('Claimed','Contacted');

  IF _active >= 4 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Close out your current leads first.');
  END IF;

  UPDATE recruiting_leads
  SET status = 'Claimed', claimed_by = _uid, claimed_at = now(), last_activity_at = now()
  WHERE id = _lead_id AND status = 'New' AND claimed_by IS NULL
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That lead was just claimed by someone else.');
  END IF;

  RETURN jsonb_build_object('success', true, 'lead', to_jsonb(_row));
END;
$$;
REVOKE ALL ON FUNCTION public.claim_lead(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.claim_lead(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_my_lead(_lead_id uuid, _status text, _notes text)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row recruiting_leads;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF _status IS NOT NULL AND _status NOT IN ('Claimed','Contacted','Booked','Signed','Dead') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  UPDATE recruiting_leads
  SET status = COALESCE(_status, status),
      notes = COALESCE(_notes, notes),
      last_activity_at = now()
  WHERE id = _lead_id AND claimed_by = _uid
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Lead not found');
  END IF;
  RETURN jsonb_build_object('success', true, 'lead', to_jsonb(_row));
END;
$$;
REVOKE ALL ON FUNCTION public.update_my_lead(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_lead(uuid, text, text) TO authenticated;

-- ============ ADMIN FUNCTIONS ============
CREATE OR REPLACE FUNCTION public.get_recruiting_funnel()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  _total int;
  _claimed int;
  _contacted int;
  _booked int;
  _signed int;
  _avg numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT count(*) INTO _total FROM recruiting_leads;
  SELECT count(*) INTO _claimed FROM recruiting_leads WHERE claimed_by IS NOT NULL OR status <> 'New';
  SELECT count(*) INTO _contacted FROM recruiting_leads WHERE status IN ('Contacted','Booked','Signed');
  SELECT count(*) INTO _booked FROM recruiting_leads WHERE status IN ('Booked','Signed');
  SELECT count(*) INTO _signed FROM recruiting_leads WHERE status = 'Signed';
  SELECT avg(EXTRACT(EPOCH FROM (claimed_at - created_at)) / 3600.0) INTO _avg
  FROM recruiting_leads WHERE claimed_at IS NOT NULL;

  RETURN jsonb_build_object(
    'total', _total, 'claimed', _claimed, 'contacted', _contacted,
    'booked', _booked, 'signed', _signed,
    'avg_hours_to_claim', COALESCE(round(_avg, 1), 0)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_recruiting_funnel() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiting_funnel() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_ref_code_leaderboard()
RETURNS TABLE(ref_code text, leads bigint, signed bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COALESCE(l.ref_code, 'none') AS ref_code,
         count(*) AS leads,
         count(*) FILTER (WHERE l.status = 'Signed') AS signed
  FROM recruiting_leads l
  WHERE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  GROUP BY 1
  ORDER BY signed DESC, leads DESC;
$$;
REVOKE ALL ON FUNCTION public.get_ref_code_leaderboard() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_ref_code_leaderboard() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_recruiting_leaderboard(_limit integer DEFAULT 20)
RETURNS TABLE(user_id uuid, full_name text, nickname text, avatar_url text, signed bigint, booked bigint, active_claims bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.full_name, p.nickname, p.avatar_url,
         count(*) FILTER (WHERE l.status = 'Signed' AND l.last_activity_at >= date_trunc('month', now())) AS signed,
         count(*) FILTER (WHERE l.status = 'Booked') AS booked,
         count(*) FILTER (WHERE l.status IN ('Claimed','Contacted')) AS active_claims
  FROM recruiting_leads l
  JOIN profiles p ON p.user_id = l.claimed_by
  WHERE auth.uid() IS NOT NULL
  GROUP BY p.user_id, p.full_name, p.nickname, p.avatar_url
  HAVING count(*) FILTER (WHERE l.status = 'Signed' AND l.last_activity_at >= date_trunc('month', now())) > 0
  ORDER BY signed DESC
  LIMIT COALESCE(_limit, 20);
$$;
REVOKE ALL ON FUNCTION public.get_recruiting_leaderboard(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_recruiting_leaderboard(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_assign_lead(_lead_id uuid, _user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path = public
AS $$
DECLARE _row recruiting_leads;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'forbidden');
  END IF;

  IF _user_id IS NULL THEN
    UPDATE recruiting_leads
    SET status = 'New', claimed_by = NULL, claimed_at = NULL, last_activity_at = NULL
    WHERE id = _lead_id RETURNING * INTO _row;
  ELSE
    UPDATE recruiting_leads
    SET claimed_by = _user_id,
        claimed_at = COALESCE(claimed_at, now()),
        last_activity_at = now(),
        status = CASE WHEN status = 'New' THEN 'Claimed' ELSE status END
    WHERE id = _lead_id RETURNING * INTO _row;
  END IF;

  RETURN jsonb_build_object('success', _row.id IS NOT NULL);
END;
$$;
REVOKE ALL ON FUNCTION public.admin_assign_lead(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_assign_lead(uuid, uuid) TO authenticated;
