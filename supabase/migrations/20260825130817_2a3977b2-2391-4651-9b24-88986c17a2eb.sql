-- ============ 1. Profile commitment fields ============
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS committed_last_day date,
  ADD COLUMN IF NOT EXISTS commitment_terms text,
  ADD COLUMN IF NOT EXISTS next_year_status text,
  ADD COLUMN IF NOT EXISTS next_year_status_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_year_notes text,
  ADD COLUMN IF NOT EXISTS next_year_updated_by uuid;

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_next_year_status_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_next_year_status_check
  CHECK (next_year_status IS NULL OR next_year_status = ANY (ARRAY['Signed','Verbal','Undecided','Not returning','No answer']));

CREATE INDEX IF NOT EXISTS profiles_committed_last_day_idx ON public.profiles (committed_last_day) WHERE archived IS NOT TRUE;

-- ============ 2. Guard the new fields from self-edits ============
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_staff boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  is_staff := public.has_role(auth.uid(),'manager')
           OR public.has_role(auth.uid(),'admin')
           OR public.has_role(auth.uid(),'owner');

  IF is_staff THEN
    RETURN NEW;
  END IF;

  NEW.approved := OLD.approved;
  NEW.status := OLD.status;
  NEW.cumulative_points := OLD.cumulative_points;
  NEW.team_id := OLD.team_id;
  NEW.direct_manager := OLD.direct_manager;
  NEW.archived := OLD.archived;
  NEW.rep_year := OLD.rep_year;
  NEW.recruited_by_user_id := OLD.recruited_by_user_id;
  NEW.recruited_by_name := OLD.recruited_by_name;
  NEW.office_id := OLD.office_id;
  NEW.vertical := OLD.vertical;
  NEW.runs_vertical := OLD.runs_vertical;
  NEW.status_detail := OLD.status_detail;
  NEW.departure_type := OLD.departure_type;
  NEW.departure_reason := OLD.departure_reason;
  NEW.last_day_worked := OLD.last_day_worked;
  NEW.revenue_to_date := OLD.revenue_to_date;
  NEW.committed_last_day := OLD.committed_last_day;
  NEW.commitment_terms := OLD.commitment_terms;
  NEW.next_year_status := OLD.next_year_status;
  NEW.next_year_status_at := OLD.next_year_status_at;
  NEW.next_year_notes := OLD.next_year_notes;
  NEW.next_year_updated_by := OLD.next_year_updated_by;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_profile_fields_trg ON public.profiles;
CREATE TRIGGER protect_privileged_profile_fields_trg
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_fields();

-- ============ 3. Commitment interviews ============
CREATE TABLE IF NOT EXISTS public.commitment_interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id uuid NOT NULL,
  manager_id uuid NOT NULL,
  season text NOT NULL DEFAULT to_char(now(), 'YYYY'),
  committed_last_day date,
  why_here text,
  next_year_intent text NOT NULL DEFAULT 'Undecided'
    CHECK (next_year_intent = ANY (ARRAY['Coming back','Undecided','Not returning'])),
  better_next_year text,
  terms_acknowledged boolean NOT NULL DEFAULT false,
  terms_text text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS commitment_interviews_rep_season_uidx
  ON public.commitment_interviews (rep_id, season);

GRANT SELECT, INSERT, UPDATE ON public.commitment_interviews TO authenticated;
GRANT ALL ON public.commitment_interviews TO service_role;

ALTER TABLE public.commitment_interviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reps can read their own commitment interview"
  ON public.commitment_interviews FOR SELECT TO authenticated
  USING (rep_id = auth.uid());

CREATE POLICY "Staff can read commitment interviews"
  ON public.commitment_interviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Staff can write commitment interviews"
  ON public.commitment_interviews FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

CREATE POLICY "Staff can update commitment interviews"
  ON public.commitment_interviews FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'manager') OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

DROP TRIGGER IF EXISTS commitment_interviews_updated_at ON public.commitment_interviews;
CREATE TRIGGER commitment_interviews_updated_at
BEFORE UPDATE ON public.commitment_interviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ 4. Win-back gold fields ============
ALTER TABLE public.recruiting_leads
  ADD COLUMN IF NOT EXISTS revenue_total numeric,
  ADD COLUMN IF NOT EXISTS weeks_active numeric,
  ADD COLUMN IF NOT EXISTS last_sale_date date,
  ADD COLUMN IF NOT EXISTS story text,
  ADD COLUMN IF NOT EXISTS priority boolean NOT NULL DEFAULT false;

-- ============ 5. Headcount target setting ============
INSERT INTO public.app_settings (key, value)
VALUES ('resign_headcount_target', '')
ON CONFLICT (key) DO NOTHING;

-- ============ 6. Commitment interview submission (transactional) ============
CREATE OR REPLACE FUNCTION public.submit_commitment_interview(
  _rep_id uuid,
  _committed_last_day date,
  _why_here text,
  _next_year_intent text,
  _better_next_year text,
  _terms_acknowledged boolean,
  _terms_text text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _season text := to_char(now(), 'YYYY');
  _status text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;
  IF NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Managers only');
  END IF;
  IF _rep_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pick a rep');
  END IF;
  IF COALESCE(_next_year_intent,'') NOT IN ('Coming back','Undecided','Not returning') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid next-year intent');
  END IF;

  INSERT INTO commitment_interviews AS ci (
    rep_id, manager_id, season, committed_last_day, why_here,
    next_year_intent, better_next_year, terms_acknowledged, terms_text
  ) VALUES (
    _rep_id, _uid, _season, _committed_last_day, NULLIF(btrim(COALESCE(_why_here,'')),''),
    _next_year_intent, NULLIF(btrim(COALESCE(_better_next_year,'')),''),
    COALESCE(_terms_acknowledged,false), NULLIF(btrim(COALESCE(_terms_text,'')),'')
  )
  ON CONFLICT (rep_id, season) DO UPDATE SET
    manager_id = _uid,
    committed_last_day = EXCLUDED.committed_last_day,
    why_here = EXCLUDED.why_here,
    next_year_intent = EXCLUDED.next_year_intent,
    better_next_year = EXCLUDED.better_next_year,
    terms_acknowledged = EXCLUDED.terms_acknowledged,
    terms_text = EXCLUDED.terms_text,
    updated_at = now();

  _status := CASE _next_year_intent
    WHEN 'Coming back' THEN 'Verbal'
    WHEN 'Not returning' THEN 'Not returning'
    ELSE 'Undecided' END;

  UPDATE profiles SET
    committed_last_day = COALESCE(_committed_last_day, committed_last_day),
    commitment_terms = COALESCE(NULLIF(btrim(COALESCE(_terms_text,'')),''), commitment_terms),
    next_year_status = CASE WHEN next_year_status = 'Signed' THEN next_year_status ELSE _status END,
    next_year_status_at = now(),
    next_year_updated_by = _uid,
    updated_at = now()
  WHERE user_id = _rep_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_commitment_interview(uuid, date, text, text, text, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_commitment_interview(uuid, date, text, text, text, boolean, text) TO authenticated;

-- ============ 7. Commitment overview (managers+) ============
CREATE OR REPLACE FUNCTION public.get_commitment_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rows jsonb;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('error', 'Managers only');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.has_interview, x.full_name), '[]'::jsonb) INTO _rows
  FROM (
    SELECT p.user_id, p.full_name, p.direct_manager, p.committed_last_day,
           p.next_year_status, p.avatar_url,
           (ci.id IS NOT NULL) AS has_interview,
           ci.created_at AS interview_at,
           ci.next_year_intent
    FROM profiles p
    LEFT JOIN commitment_interviews ci
      ON ci.rep_id = p.user_id AND ci.season = to_char(now(),'YYYY')
    WHERE p.archived IS NOT TRUE AND p.approved IS TRUE
  ) x;

  RETURN jsonb_build_object('reps', _rows, 'season', to_char(now(),'YYYY'));
END;
$$;

REVOKE ALL ON FUNCTION public.get_commitment_overview() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_commitment_overview() TO authenticated;

-- ============ 8. Finishing soon + gap count ============
CREATE OR REPLACE FUNCTION public.get_finishing_soon(_days integer DEFAULT 14)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _soon jsonb;
  _gap int;
  _gap_list jsonb;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('error', 'Managers only');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.committed_last_day), '[]'::jsonb) INTO _soon
  FROM (
    SELECT p.user_id, p.full_name, p.avatar_url, p.direct_manager,
           p.committed_last_day, p.commitment_terms, p.next_year_status
    FROM profiles p
    WHERE p.archived IS NOT TRUE AND p.approved IS TRUE
      AND p.committed_last_day IS NOT NULL
      AND p.committed_last_day >= current_date
      AND p.committed_last_day <= current_date + COALESCE(_days,14)
  ) x;

  SELECT count(*)::int INTO _gap
  FROM profiles p
  WHERE p.archived IS NOT TRUE AND p.approved IS TRUE AND p.committed_last_day IS NULL;

  SELECT COALESCE(jsonb_agg(row_to_json(y)::jsonb ORDER BY y.full_name), '[]'::jsonb) INTO _gap_list
  FROM (
    SELECT p.user_id, p.full_name, p.direct_manager
    FROM profiles p
    WHERE p.archived IS NOT TRUE AND p.approved IS TRUE AND p.committed_last_day IS NULL
    LIMIT 300
  ) y;

  RETURN jsonb_build_object('soon', _soon, 'no_date_count', _gap, 'no_date', _gap_list);
END;
$$;

REVOKE ALL ON FUNCTION public.get_finishing_soon(integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_finishing_soon(integer) TO authenticated;

-- ============ 9. Re-sign board ============
CREATE OR REPLACE FUNCTION public.get_resign_board()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _rows jsonb;
  _target int;
  _signed int;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('error', 'Managers only');
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.full_name), '[]'::jsonb) INTO _rows
  FROM (
    SELECT p.user_id, p.full_name, p.avatar_url, p.direct_manager, p.rep_year,
           p.next_year_status, p.next_year_status_at, p.next_year_notes,
           p.committed_last_day, p.archived,
           (p.archived IS TRUE) AS is_alumni
    FROM profiles p
    WHERE (p.archived IS NOT TRUE AND p.approved IS TRUE)
       OR EXISTS (
         SELECT 1 FROM recruiting_leads l
         WHERE l.source_profile_id = p.user_id AND l.status = 'Returning'
       )
  ) x;

  SELECT NULLIF(btrim(value), '')::int INTO _target FROM app_settings WHERE key = 'resign_headcount_target';

  SELECT count(*)::int INTO _signed FROM profiles p
  WHERE p.next_year_status = 'Signed'
    AND ((p.archived IS NOT TRUE AND p.approved IS TRUE)
      OR EXISTS (SELECT 1 FROM recruiting_leads l WHERE l.source_profile_id = p.user_id AND l.status = 'Returning'));

  RETURN jsonb_build_object('reps', _rows, 'target', _target, 'signed', _signed);
END;
$$;

REVOKE ALL ON FUNCTION public.get_resign_board() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resign_board() TO authenticated;

-- ============ 10. Set next-year status (posts to #wins on Signed) ============
CREATE OR REPLACE FUNCTION public.set_next_year_status(_user_id uuid, _status text, _notes text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _prev text;
  _name text;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Managers only');
  END IF;
  IF COALESCE(_status,'') NOT IN ('Signed','Verbal','Undecided','Not returning','No answer') THEN
    RETURN jsonb_build_object('success', false, 'error', 'Invalid status');
  END IF;

  SELECT next_year_status, full_name INTO _prev, _name FROM profiles WHERE user_id = _user_id;
  IF _name IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Rep not found');
  END IF;

  UPDATE profiles SET
    next_year_status = _status,
    next_year_status_at = now(),
    next_year_notes = COALESCE(NULLIF(btrim(COALESCE(_notes,'')),''), next_year_notes),
    next_year_updated_by = _uid,
    updated_at = now()
  WHERE user_id = _user_id;

  IF _status = 'Signed' AND COALESCE(_prev,'') <> 'Signed' THEN
    IF NOT EXISTS (
      SELECT 1 FROM chat_messages
      WHERE channel = 'wins' AND content LIKE '[[RESIGN|' || _user_id::text || '%'
    ) THEN
      INSERT INTO chat_messages (user_id, content, is_ai, channel)
      VALUES (_uid, '[[RESIGN|' || _user_id::text || ']]' || _name || ' is signed for next season', true, 'wins');
    END IF;
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_next_year_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_next_year_status(uuid, text, text) TO authenticated;

-- ============ 11. Win-back gold: match preview + reviewed apply ============
CREATE OR REPLACE FUNCTION public.match_winback_gold(_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _out jsonb;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('error', 'Admins only');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'name', r.name,
           'revenue', r.revenue,
           'weeks', r.weeks,
           'last_sale', r.last_sale,
           'note', r.note,
           'lead_id', m.id,
           'lead_name', m.first_name
         ) ORDER BY r.ord), '[]'::jsonb) INTO _out
  FROM (
    SELECT ord,
           btrim(COALESCE(elem->>'name','')) AS name,
           NULLIF(btrim(COALESCE(elem->>'revenue','')),'') AS revenue,
           NULLIF(btrim(COALESCE(elem->>'weeks','')),'') AS weeks,
           NULLIF(btrim(COALESCE(elem->>'last_sale','')),'') AS last_sale,
           NULLIF(btrim(COALESCE(elem->>'note','')),'') AS note
    FROM jsonb_array_elements(COALESCE(_rows,'[]'::jsonb)) WITH ORDINALITY AS t(elem, ord)
  ) r
  LEFT JOIN LATERAL (
    SELECT l.id, l.first_name FROM recruiting_leads l
    WHERE COALESCE(l.ref_code,'') = 'winback'
      AND lower(btrim(l.first_name)) = lower(r.name)
    ORDER BY l.created_at LIMIT 1
  ) m ON true;

  RETURN jsonb_build_object('rows', _out);
END;
$$;

REVOKE ALL ON FUNCTION public.match_winback_gold(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.match_winback_gold(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.apply_winback_gold(_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _r record;
  _applied int := 0;
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Admins only');
  END IF;

  FOR _r IN
    SELECT (elem->>'lead_id')::uuid AS lead_id,
           NULLIF(btrim(COALESCE(elem->>'revenue','')),'')::numeric AS revenue,
           NULLIF(btrim(COALESCE(elem->>'weeks','')),'')::numeric AS weeks,
           NULLIF(btrim(COALESCE(elem->>'last_sale','')),'')::date AS last_sale,
           NULLIF(btrim(COALESCE(elem->>'note','')),'') AS note
    FROM jsonb_array_elements(COALESCE(_rows,'[]'::jsonb)) AS t(elem)
    WHERE NULLIF(btrim(COALESCE(elem->>'lead_id','')),'') IS NOT NULL
  LOOP
    UPDATE recruiting_leads SET
      revenue_total = COALESCE(_r.revenue, revenue_total),
      weeks_active = COALESCE(_r.weeks, weeks_active),
      last_sale_date = COALESCE(_r.last_sale, last_sale_date),
      story = COALESCE(_r.note, story)
    WHERE id = _r.lead_id AND COALESCE(ref_code,'') = 'winback';
    IF FOUND THEN _applied := _applied + 1; END IF;
  END LOOP;

  RETURN jsonb_build_object('success', true, 'applied', _applied);
END;
$$;

REVOKE ALL ON FUNCTION public.apply_winback_gold(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.apply_winback_gold(jsonb) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_winback_priority(_lead_id uuid, _priority boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL OR NOT (public.has_role(_uid,'manager') OR public.has_role(_uid,'admin') OR public.has_role(_uid,'owner')) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Managers only');
  END IF;
  UPDATE recruiting_leads SET priority = COALESCE(_priority,false)
  WHERE id = _lead_id AND COALESCE(ref_code,'') = 'winback';
  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.set_winback_priority(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_winback_priority(uuid, boolean) TO authenticated;

-- ============ 12. Win-back feed carries the gold fields ============
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

  SELECT COALESCE(jsonb_agg(row_to_json(x)::jsonb ORDER BY x.sort_key), '[]'::jsonb) INTO _pool
  FROM (
    SELECT l.id, l.first_name AS name, l.city, l.notes, l.contact_count,
           l.last_contact_at,
           l.revenue_total, l.weeks_active, l.last_sale_date, l.story, l.priority,
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

  SELECT COALESCE(jsonb_agg(row_to_json(y)::jsonb ORDER BY y.claimed_at DESC), '[]'::jsonb) INTO _mine
  FROM (
    SELECT l.id, l.first_name AS name, l.city, l.phone, l.notes, l.contact_count,
           l.last_contact_at, l.claimed_at, l.last_activity_at,
           l.revenue_total, l.weeks_active, l.last_sale_date, l.story, l.priority
    FROM recruiting_leads l
    WHERE COALESCE(l.ref_code,'') = 'winback' AND l.status = 'Winback Claimed' AND l.claimed_by = _uid
  ) y;

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