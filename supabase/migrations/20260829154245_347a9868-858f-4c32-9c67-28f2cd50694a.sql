-- ============ 1. FIBER EDITORS ============
CREATE TABLE IF NOT EXISTS public.fiber_editors (
  user_id uuid NOT NULL PRIMARY KEY,
  granted_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fiber_editors TO authenticated;
GRANT ALL ON public.fiber_editors TO service_role;

ALTER TABLE public.fiber_editors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed in can read fiber editors"
ON public.fiber_editors FOR SELECT TO authenticated USING (true);

CREATE POLICY "Owner manages fiber editors"
ON public.fiber_editors FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

INSERT INTO public.fiber_editors (user_id)
VALUES ('70eeded3-4c88-41ee-8049-2b75e92cb866'), ('00baa414-57c8-42e5-a20b-3804412aab58')
ON CONFLICT (user_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_fiber_editor(_uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.fiber_editors WHERE user_id = _uid);
$$;

REVOKE ALL ON FUNCTION public.is_fiber_editor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_fiber_editor(uuid) TO authenticated, service_role;

-- Fiber settings keys are writable only by fiber editors.
DROP POLICY IF EXISTS "Only admins can modify app_settings" ON public.app_settings;
CREATE POLICY "Only admins can modify app_settings"
ON public.app_settings FOR ALL TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  AND (key NOT LIKE 'fiber\_%' OR public.is_fiber_editor(auth.uid()))
)
WITH CHECK (
  has_role(auth.uid(), 'admin'::app_role)
  AND (key NOT LIKE 'fiber\_%' OR public.is_fiber_editor(auth.uid()))
);

-- ============ 2. NAME NORMALISATION ============
CREATE OR REPLACE FUNCTION public.lead_norm_name(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT nullif(regexp_replace(lower(btrim(coalesce(_name, ''))), '\s+', ' ', 'g'), '');
$$;

REVOKE ALL ON FUNCTION public.lead_norm_name(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_norm_name(text) TO authenticated, service_role;

-- First plus last token, so missing middle names still match.
CREATE OR REPLACE FUNCTION public.lead_name_key(_name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  WITH t AS (
    SELECT string_to_array(public.lead_norm_name(_name), ' ') AS parts
  )
  SELECT CASE
    WHEN parts IS NULL OR array_length(parts, 1) IS NULL THEN NULL
    WHEN array_length(parts, 1) = 1 THEN parts[1]
    ELSE parts[1] || ' ' || parts[array_length(parts, 1)]
  END
  FROM t;
$$;

REVOKE ALL ON FUNCTION public.lead_name_key(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_name_key(text) TO authenticated, service_role;

-- ============ 3. BLOCKED MANAGERS (BINGHAM SYSTEM) ============
CREATE TABLE IF NOT EXISTS public.lead_route_blocked_managers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid,
  full_name text NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.lead_route_blocked_managers TO authenticated;
GRANT ALL ON public.lead_route_blocked_managers TO service_role;

ALTER TABLE public.lead_route_blocked_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can read blocked managers"
ON public.lead_route_blocked_managers FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'owner'::app_role));

CREATE POLICY "Owner manages blocked managers"
ON public.lead_route_blocked_managers FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role))
WITH CHECK (has_role(auth.uid(), 'owner'::app_role));

INSERT INTO public.lead_route_blocked_managers (user_id, full_name, reason)
SELECT p.user_id, p.full_name, 'No longer with the company'
FROM public.profiles p
WHERE p.user_id = 'f1a8d4c3-7487-465b-86ac-96d57d3dbfa5'
   OR p.user_id IN (
     SELECT child_user_id FROM public.downline_edges
     WHERE parent_user_id = 'f1a8d4c3-7487-465b-86ac-96d57d3dbfa5'
   );

-- Free every lead designated to Joshua Bingham.
UPDATE public.people_leads
SET designated_to = NULL,
    designation_status = 'free',
    designated_at = NULL,
    updated_at = now()
WHERE designated_to = 'f1a8d4c3-7487-465b-86ac-96d57d3dbfa5';

CREATE OR REPLACE FUNCTION public.lead_manager_blocked(_name text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lead_route_blocked_managers b
    WHERE public.lead_name_key(b.full_name) = public.lead_name_key(_name)
  );
$$;

REVOKE ALL ON FUNCTION public.lead_manager_blocked(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_manager_blocked(text) TO authenticated, service_role;

-- ============ 4. THE MANAGER FUNNEL ============
-- Confident match: exactly one active profile whose name key matches, and the
-- former manager is not on the blocked list.
CREATE OR REPLACE FUNCTION public.lead_match_manager(_former_manager_name text)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _key text := public.lead_name_key(_former_manager_name);
  _hit uuid;
  _n int;
BEGIN
  IF _key IS NULL THEN RETURN NULL; END IF;
  IF public.lead_manager_blocked(_former_manager_name) THEN RETURN NULL; END IF;

  -- exact, case insensitive
  SELECT count(*), min(p.user_id) INTO _n, _hit
  FROM public.profiles p
  WHERE p.status = 'active'
    AND public.lead_norm_name(p.full_name) = public.lead_norm_name(_former_manager_name);
  IF _n = 1 THEN RETURN _hit; END IF;

  -- first plus last name variant
  SELECT count(*), min(p.user_id) INTO _n, _hit
  FROM public.profiles p
  WHERE p.status = 'active'
    AND public.lead_name_key(p.full_name) = _key;
  IF _n = 1 THEN RETURN _hit; END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.lead_match_manager(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_match_manager(text) TO authenticated, service_role;

-- Route the free pool to direct managers. Owner and admin only.
CREATE OR REPLACE FUNCTION public.route_people_leads()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _routed int := 0;
  _r record;
  _mgr uuid;
BEGIN
  IF NOT (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  FOR _r IN
    SELECT id, former_manager_name
    FROM public.people_leads
    WHERE designated_to IS NULL
      AND designation_status <> 'declined'
      AND former_manager_name IS NOT NULL
  LOOP
    _mgr := public.lead_match_manager(_r.former_manager_name);
    IF _mgr IS NOT NULL THEN
      UPDATE public.people_leads
      SET designated_to = _mgr,
          designation_status = 'designated',
          designated_at = now(),
          updated_at = now()
      WHERE id = _r.id;
      _routed := _routed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object('routed', _routed);
END;
$$;

REVOKE ALL ON FUNCTION public.route_people_leads() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.route_people_leads() TO authenticated, service_role;

-- A manager declines a lead: it drops to the open pool for anyone.
CREATE OR REPLACE FUNCTION public.lead_decline_designation(_lead_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
BEGIN
  SELECT designated_to INTO _owner FROM public.people_leads WHERE id = _lead_id;
  IF _owner IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Already in the pool'); END IF;

  IF NOT (
    _owner = auth.uid()
    OR has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  UPDATE public.people_leads
  SET designated_to = NULL,
      designation_status = 'declined',
      designated_at = NULL,
      freed_by = auth.uid(),
      freed_at = now(),
      updated_at = now()
  WHERE id = _lead_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.lead_decline_designation(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_decline_designation(uuid) TO authenticated, service_role;

-- Owner assignment queue: no confident manager match.
CREATE OR REPLACE FUNCTION public.lead_assignment_queue(_limit int DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows jsonb;
BEGIN
  IF NOT (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO _rows
  FROM (
    SELECT l.id,
           l.full_name,
           l.phone,
           l.former_manager_name,
           l.team_name,
           l.season_revenue,
           public.lead_manager_blocked(l.former_manager_name) AS manager_gone
    FROM public.people_leads l
    WHERE l.designated_to IS NULL
      AND l.bucket = 'lead'
      AND public.lead_match_manager(l.former_manager_name) IS NULL
    ORDER BY l.season_revenue DESC NULLS LAST, l.full_name
    LIMIT greatest(1, least(coalesce(_limit, 50), 200))
  ) x;

  RETURN _rows;
END;
$$;

REVOKE ALL ON FUNCTION public.lead_assignment_queue(int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_assignment_queue(int) TO authenticated, service_role;

-- One tap assignment by the owner or an admin.
CREATE OR REPLACE FUNCTION public.lead_assign_to_manager(_lead_id uuid, _to uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'admin'::app_role)) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE user_id = _to) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Unknown person');
  END IF;

  UPDATE public.people_leads
  SET designated_to = _to,
      designation_status = 'designated',
      designated_at = now(),
      updated_at = now()
  WHERE id = _lead_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

REVOKE ALL ON FUNCTION public.lead_assign_to_manager(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.lead_assign_to_manager(uuid, uuid) TO authenticated, service_role;