ALTER TABLE public.recruiting_leads ALTER COLUMN phone DROP NOT NULL;

-- Manual lead entry for any authenticated rep/manager; auto-claimed by creator
CREATE OR REPLACE FUNCTION public.add_manual_lead(
  _first_name text,
  _phone text DEFAULT NULL,
  _city text DEFAULT NULL,
  _interest_reason text DEFAULT NULL,
  _notes text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row recruiting_leads;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF _first_name IS NULL OR btrim(_first_name) = '' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Name is required');
  END IF;

  INSERT INTO recruiting_leads (first_name, phone, city, interest_reason, notes, ref_code, status, claimed_by, claimed_at, last_activity_at)
  VALUES (
    left(btrim(_first_name), 120),
    NULLIF(btrim(COALESCE(_phone, '')), ''),
    NULLIF(btrim(COALESCE(_city, '')), ''),
    NULLIF(btrim(COALESCE(_interest_reason, '')), ''),
    NULLIF(btrim(COALESCE(_notes, '')), ''),
    'manual',
    'Claimed',
    _uid,
    now(),
    now()
  )
  RETURNING * INTO _row;

  RETURN jsonb_build_object('success', true, 'lead', to_jsonb(_row));
END;
$$;

REVOKE ALL ON FUNCTION public.add_manual_lead(text, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_manual_lead(text, text, text, text, text) TO authenticated;

-- Legacy pipeline imports do not count against the active claim cap
CREATE OR REPLACE FUNCTION public.claim_lead(_lead_id uuid)
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
  WHERE claimed_by = _uid
    AND status IN ('Claimed','Contacted')
    AND COALESCE(ref_code, '') <> 'pipeline-import';

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

-- Legacy pipeline imports are never auto-released
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
  FOR r IN
    SELECT id, first_name, claimed_by
    FROM recruiting_leads
    WHERE status IN ('Claimed','Contacted')
      AND COALESCE(ref_code, '') <> 'pipeline-import'
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