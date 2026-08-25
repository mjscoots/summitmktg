-- ============ 1. Schema ============
ALTER TABLE public.recruiting_leads
  ADD COLUMN IF NOT EXISTS source_profile_id uuid,
  ADD COLUMN IF NOT EXISTS last_contact_at timestamptz,
  ADD COLUMN IF NOT EXISTS contact_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sourced_by uuid;

ALTER TABLE public.recruiting_leads DROP CONSTRAINT IF EXISTS recruiting_leads_status_check;
ALTER TABLE public.recruiting_leads ADD CONSTRAINT recruiting_leads_status_check
  CHECK (status = ANY (ARRAY['New','Claimed','Contacted','Booked','Signed','Dead','Winback','Winback Claimed','Returning']));

CREATE UNIQUE INDEX IF NOT EXISTS recruiting_leads_source_profile_uidx
  ON public.recruiting_leads (source_profile_id) WHERE source_profile_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS recruiting_leads_winback_idx
  ON public.recruiting_leads (status, last_contact_at) WHERE ref_code = 'winback';

-- ============ 2. Contact log ============
CREATE TABLE IF NOT EXISTS public.winback_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.recruiting_leads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  outcome text NOT NULL CHECK (outcome IN ('no_answer','voicemail','not_interested','maybe_later','coming_back')),
  note text CHECK (note IS NULL OR char_length(note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.winback_contacts TO authenticated;
GRANT ALL ON public.winback_contacts TO service_role;

ALTER TABLE public.winback_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps can read winback contact history"
  ON public.winback_contacts FOR SELECT TO authenticated
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS winback_contacts_lead_idx ON public.winback_contacts (lead_id, created_at DESC);

-- ============ 3. Feed ============
CREATE OR REPLACE FUNCTION public.get_winback_feed()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _pool jsonb;
  _mine jsonb;
  _returning jsonb;
  _active int;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('error', 'Not authenticated');
  END IF;

  SELECT count(*)::int INTO _active
  FROM recruiting_leads
  WHERE claimed_by = _uid AND status = 'Winback Claimed' AND COALESCE(ref_code,'') = 'winback';

  -- Pooled: never-contacted and longest-since-contact first
  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.sort_key), '[]'::jsonb) INTO _pool
  FROM (
    SELECT l.id, l.first_name AS name, l.city, l.notes, l.contact_count,
           l.last_contact_at,
           lc.outcome AS last_outcome,
           p.full_name AS last_by,
           COALESCE(l.last_contact_at, '1970-01-01'::timestamptz) AS sort_key
    FROM recruiting_leads l
    LEFT JOIN LATERAL (
      SELECT c.outcome, c.user_id FROM winback_contacts c
      WHERE c.lead_id = l.id ORDER BY c.created_at DESC LIMIT 1
    ) lc ON true
    LEFT JOIN profiles p ON p.user_id = lc.user_id
    WHERE COALESCE(l.ref_code,'') = 'winback' AND l.status = 'Winback' AND l.claimed_by IS NULL
    LIMIT 500
  ) x;

  -- My claimed win-backs (phone revealed)
  SELECT COALESCE(jsonb_agg(row_to_json(y)::jsonb ORDER BY y.claimed_at DESC), '[]'::jsonb) INTO _mine
  FROM (
    SELECT l.id, l.first_name AS name, l.city, l.phone, l.notes, l.contact_count,
           l.last_contact_at, l.claimed_at, l.last_activity_at
    FROM recruiting_leads l
    WHERE COALESCE(l.ref_code,'') = 'winback' AND l.status = 'Winback Claimed' AND l.claimed_by = _uid
  ) y;

  -- Returning
  SELECT COALESCE(jsonb_agg(row_to_json(z)::jsonb ORDER BY z.last_activity_at DESC NULLS LAST), '[]'::jsonb) INTO _returning
  FROM (
    SELECT l.id, l.first_name AS name, l.city, l.notes, l.source_profile_id,
           l.last_activity_at, l.sourced_by,
           sp.full_name AS sourced_by_name,
           CASE WHEN l.claimed_by = _uid OR public.has_role(_uid,'manager')
                     OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')
                THEN l.phone ELSE NULL END AS phone
    FROM recruiting_leads l
    LEFT JOIN profiles sp ON sp.user_id = l.sourced_by
    WHERE COALESCE(l.ref_code,'') = 'winback' AND l.status = 'Returning'
    LIMIT 200
  ) z;

  RETURN jsonb_build_object(
    'pool', _pool, 'mine', _mine, 'returning', _returning,
    'my_active', _active, 'cap', 5
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_winback_feed() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_winback_feed() TO authenticated;

-- ============ 4. Claim ============
CREATE OR REPLACE FUNCTION public.claim_winback(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  WHERE claimed_by = _uid AND status = 'Winback Claimed' AND COALESCE(ref_code,'') = 'winback';

  IF _active >= 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'You already hold 5 win-backs. Log an outcome on one first.');
  END IF;

  UPDATE recruiting_leads
  SET status = 'Winback Claimed', claimed_by = _uid, claimed_at = now(), last_activity_at = now()
  WHERE id = _lead_id AND COALESCE(ref_code,'') = 'winback'
    AND status = 'Winback' AND claimed_by IS NULL
  RETURNING * INTO _row;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Someone else just claimed that one.');
  END IF;

  RETURN jsonb_build_object('success', true, 'phone', _row.phone);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_winback(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_winback(uuid) TO authenticated;

-- ============ 5. Log an outcome ============
CREATE OR REPLACE FUNCTION public.log_winback_contact(_lead_id uuid, _outcome text, _note text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row recruiting_leads;
  _name text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF _outcome NOT IN ('no_answer','voicemail','not_interested','maybe_later','coming_back') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid outcome');
  END IF;

  SELECT * INTO _row FROM recruiting_leads
  WHERE id = _lead_id AND claimed_by = _uid AND COALESCE(ref_code,'') = 'winback'
    AND status = 'Winback Claimed'
  FOR UPDATE;

  IF _row.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'That win-back is no longer yours.');
  END IF;

  IF _outcome = 'coming_back' THEN
    UPDATE recruiting_leads
    SET status = 'Returning', sourced_by = _uid, last_activity_at = now(),
        notes = CASE WHEN COALESCE(_note,'') = '' THEN notes
                     ELSE COALESCE(notes || E'\n', '') || _note END
    WHERE id = _lead_id;

    SELECT COALESCE(full_name, 'A rep') INTO _name FROM profiles WHERE user_id = _uid;

    INSERT INTO public.user_notifications (user_id, title, message, link)
    SELECT DISTINCT ur.user_id,
           'Former rep coming back',
           _row.first_name || ' wants back in — sourced by ' || _name || '.',
           '/app/recruits?winback=' || _lead_id::text
    FROM public.user_roles ur
    WHERE ur.role IN ('manager','admin','owner');

    RETURN jsonb_build_object('success', true, 'returning', true);
  END IF;

  INSERT INTO public.winback_contacts (lead_id, user_id, outcome, note)
  VALUES (_lead_id, _uid, _outcome, NULLIF(_note, ''));

  UPDATE recruiting_leads
  SET status = 'Winback',
      claimed_by = NULL,
      claimed_at = NULL,
      last_activity_at = NULL,
      last_contact_at = now(),
      contact_count = COALESCE(contact_count, 0) + 1
  WHERE id = _lead_id;

  RETURN jsonb_build_object('success', true, 'returning', false);
END;
$$;

REVOKE ALL ON FUNCTION public.log_winback_contact(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_winback_contact(uuid, text, text) TO authenticated;

-- ============ 6. Keep win-backs out of the ticket system ============
CREATE OR REPLACE FUNCTION public.get_my_leads()
RETURNS TABLE(id uuid, first_name text, phone text, city text, interest_reason text, ref_code text, status text, claimed_at timestamp with time zone, last_activity_at timestamp with time zone, notes text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT l.id, l.first_name, l.phone, l.city, l.interest_reason, l.ref_code,
         l.status, l.claimed_at, l.last_activity_at, l.notes, l.created_at
  FROM recruiting_leads l
  WHERE auth.uid() IS NOT NULL AND l.claimed_by = auth.uid()
    AND COALESCE(l.ref_code, '') <> 'winback'
  ORDER BY l.claimed_at DESC NULLS LAST
  LIMIT 300;
$$;

CREATE OR REPLACE FUNCTION public.get_recruiting_funnel()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _total int; _claimed int; _contacted int; _booked int; _signed int; _avg numeric;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  SELECT count(*) INTO _total FROM recruiting_leads WHERE COALESCE(ref_code,'') <> 'winback';
  SELECT count(*) INTO _claimed FROM recruiting_leads WHERE COALESCE(ref_code,'') <> 'winback' AND (claimed_by IS NOT NULL OR status <> 'New');
  SELECT count(*) INTO _contacted FROM recruiting_leads WHERE COALESCE(ref_code,'') <> 'winback' AND status IN ('Contacted','Booked','Signed');
  SELECT count(*) INTO _booked FROM recruiting_leads WHERE COALESCE(ref_code,'') <> 'winback' AND status IN ('Booked','Signed');
  SELECT count(*) INTO _signed FROM recruiting_leads WHERE COALESCE(ref_code,'') <> 'winback' AND status = 'Signed';
  SELECT avg(EXTRACT(EPOCH FROM (claimed_at - created_at)) / 3600.0) INTO _avg
  FROM recruiting_leads WHERE claimed_at IS NOT NULL AND COALESCE(ref_code,'') <> 'winback';

  RETURN jsonb_build_object(
    'total', _total, 'claimed', _claimed, 'contacted', _contacted,
    'booked', _booked, 'signed', _signed,
    'avg_hours_to_claim', COALESCE(round(_avg, 1), 0)
  );
END;
$$;

-- Speed-to-lead sweep must ignore win-backs entirely
CREATE OR REPLACE FUNCTION public.sweep_speed_to_lead()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record; m record; target uuid; warned int := 0; assigned int := 0; lnk text;
BEGIN
  FOR r IN
    SELECT id, first_name FROM public.recruiting_leads
    WHERE status = 'New' AND claimed_by IS NULL
      AND COALESCE(ref_code,'') NOT IN ('pipeline-import','winback')
      AND created_at < now() - interval '2 hours'
  LOOP
    lnk := '/app/recruits?lead=' || r.id::text;
    FOR m IN
      SELECT DISTINCT ur.user_id FROM public.user_roles ur
      WHERE ur.role IN ('manager','admin','owner')
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM public.user_notifications un
        WHERE un.user_id = m.user_id AND un.link = lnk AND un.title = 'Lead waiting'
      ) THEN
        INSERT INTO public.user_notifications (user_id, title, message, link)
        VALUES (m.user_id, 'Lead waiting',
                'Lead waiting: ' || COALESCE(r.first_name,'Unnamed') || ' — unclaimed for 2h+.', lnk);
        warned := warned + 1;
      END IF;
    END LOOP;
  END LOOP;

  FOR r IN
    SELECT id, first_name FROM public.recruiting_leads
    WHERE status = 'New' AND claimed_by IS NULL
      AND COALESCE(ref_code,'') NOT IN ('pipeline-import','winback')
      AND created_at < now() - interval '24 hours'
      AND COALESCE(notes,'') NOT LIKE '%Auto-assigned after 24h unclaimed.%'
    FOR UPDATE
  LOOP
    SELECT p.user_id INTO target
    FROM public.profiles p
    WHERE p.user_id IS NOT NULL
      AND (p.status = 'active' AND p.archived = false)
      AND (
        SELECT count(*) FROM public.recruiting_leads l
        WHERE l.claimed_by = p.user_id AND l.status IN ('Claimed','Contacted')
          AND COALESCE(l.ref_code,'') <> 'pipeline-import'
      ) < 4
    ORDER BY (
      SELECT count(*) FROM public.recruiting_leads l2
      WHERE l2.claimed_by = p.user_id AND l2.status = 'Signed'
    ) DESC, random()
    LIMIT 1;

    IF target IS NULL THEN CONTINUE; END IF;

    UPDATE public.recruiting_leads
    SET status = 'Claimed', claimed_by = target, claimed_at = now(), last_activity_at = now(),
        notes = COALESCE(notes || E'\n', '') || 'Auto-assigned after 24h unclaimed.'
    WHERE id = r.id;

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (target, 'Lead assigned to you',
            COALESCE(r.first_name,'A lead') || ' was auto-assigned after 24h unclaimed. Call them now.',
            '/app/recruits?lead=' || r.id::text);

    assigned := assigned + 1;
  END LOOP;

  RETURN jsonb_build_object('warned', warned, 'assigned', assigned);
END;
$$;

-- 48h idle release, now covering win-back claims (no contact stamp)
CREATE OR REPLACE FUNCTION public.release_stale_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  PERFORM public.notify_lead_expiry_warnings();
  PERFORM public.sweep_speed_to_lead();

  FOR r IN
    SELECT id, first_name, claimed_by
    FROM public.recruiting_leads
    WHERE status IN ('Claimed','Contacted')
      AND COALESCE(ref_code, '') <> 'pipeline-import'
      AND COALESCE(last_activity_at, claimed_at) < now() - interval '48 hours'
    FOR UPDATE
  LOOP
    UPDATE public.recruiting_leads
    SET status = 'New', claimed_by = NULL, claimed_at = NULL, last_activity_at = NULL
    WHERE id = r.id;

    IF r.claimed_by IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Lead released',
              'You lost ' || r.first_name || ' — no activity in 48 hours.',
              '/app/recruits');
    END IF;

    n := n + 1;
  END LOOP;

  FOR r IN
    SELECT id, first_name, claimed_by
    FROM public.recruiting_leads
    WHERE status = 'Winback Claimed'
      AND COALESCE(ref_code,'') = 'winback'
      AND COALESCE(last_activity_at, claimed_at) < now() - interval '48 hours'
    FOR UPDATE
  LOOP
    UPDATE public.recruiting_leads
    SET status = 'Winback', claimed_by = NULL, claimed_at = NULL, last_activity_at = NULL
    WHERE id = r.id;

    IF r.claimed_by IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Win-back released',
              r.first_name || ' went back to the win-back pool — no call logged in 48 hours.',
              '/app/recruits');
    END IF;

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;