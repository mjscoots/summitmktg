-- 1. PARTNERS
CREATE TABLE IF NOT EXISTS public.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code text NOT NULL UNIQUE,
  contact text,
  verticals text[] NOT NULL DEFAULT '{}',
  terms_note text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.partners TO authenticated;
GRANT ALL ON public.partners TO service_role;
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS partners_admin_all ON public.partners;
CREATE POLICY partners_admin_all ON public.partners FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner'));

-- 2. SOURCE COLUMNS
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS vertical text,
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'organic',
  ADD COLUMN IF NOT EXISTS source_code text,
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.recruiting_leads
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'organic',
  ADD COLUMN IF NOT EXISTS source_code text,
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL;

ALTER TABLE public.rep_vertical_enrollments
  ADD COLUMN IF NOT EXISTS source_type text NOT NULL DEFAULT 'organic',
  ADD COLUMN IF NOT EXISTS source_code text,
  ADD COLUMN IF NOT EXISTS referrer_user_id uuid,
  ADD COLUMN IF NOT EXISTS partner_id uuid REFERENCES public.partners(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sourced_by text NOT NULL DEFAULT 'summit';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_source_type_check') THEN
    ALTER TABLE public.applications ADD CONSTRAINT applications_source_type_check
      CHECK (source_type IN ('golden_ticket','rep_referral','partner','organic','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'recruiting_leads_source_type_check') THEN
    ALTER TABLE public.recruiting_leads ADD CONSTRAINT recruiting_leads_source_type_check
      CHECK (source_type IN ('golden_ticket','rep_referral','partner','organic','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rve_source_type_check') THEN
    ALTER TABLE public.rep_vertical_enrollments ADD CONSTRAINT rve_source_type_check
      CHECK (source_type IN ('golden_ticket','rep_referral','partner','organic','other'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'rve_sourced_by_check') THEN
    ALTER TABLE public.rep_vertical_enrollments ADD CONSTRAINT rve_sourced_by_check
      CHECK (sourced_by IN ('summit','leader'));
  END IF;
END $$;

-- 3. DERIVE sourced_by AND KEEP stack_source IN SYNC
CREATE OR REPLACE FUNCTION public.derive_enrollment_source()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _is_leader boolean := false;
BEGIN
  IF NEW.source_type = 'rep_referral' AND NEW.referrer_user_id IS NOT NULL AND NEW.paired_manager IS NOT NULL THEN
    SELECT EXISTS (
      WITH RECURSIVE tree AS (
        SELECT child_user_id FROM public.downline_edges
          WHERE parent_user_id = NEW.paired_manager AND edge_type = 'manages'
        UNION
        SELECT e.child_user_id FROM public.downline_edges e
          JOIN tree t ON e.parent_user_id = t.child_user_id
          WHERE e.edge_type = 'manages'
      )
      SELECT 1 FROM tree WHERE child_user_id = NEW.referrer_user_id
      UNION ALL SELECT 1 WHERE NEW.referrer_user_id = NEW.paired_manager
    ) INTO _is_leader;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.sourced_by := CASE WHEN _is_leader THEN 'leader' ELSE 'summit' END;
  END IF;

  NEW.stack_source := CASE WHEN NEW.sourced_by = 'leader' THEN 'self' ELSE 'summit' END;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_derive_enrollment_source ON public.rep_vertical_enrollments;
CREATE TRIGGER trg_derive_enrollment_source
  BEFORE INSERT OR UPDATE OF sourced_by, referrer_user_id, source_type, paired_manager
  ON public.rep_vertical_enrollments
  FOR EACH ROW EXECUTE FUNCTION public.derive_enrollment_source();

CREATE OR REPLACE FUNCTION public.admin_set_sourced_by(_user_id uuid, _vertical text, _sourced_by text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;
  IF _sourced_by NOT IN ('summit','leader') THEN
    RAISE EXCEPTION 'Invalid value';
  END IF;
  UPDATE public.rep_vertical_enrollments
     SET sourced_by = _sourced_by, updated_at = now()
   WHERE user_id = _user_id AND vertical = _vertical;
  PERFORM public.write_audit('sourced_by','rep_vertical_enrollments', _user_id::text,
    jsonb_build_object('vertical', _vertical, 'sourced_by', _sourced_by));
END;
$$;
REVOKE ALL ON FUNCTION public.admin_set_sourced_by(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_sourced_by(uuid,text,text) TO authenticated, service_role;

-- 4. ENROLLMENT ON APPROVAL
CREATE OR REPLACE FUNCTION public.enroll_vertical_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _app RECORD;
BEGIN
  IF NEW.status = 'active' AND COALESCE(OLD.status::text,'') <> 'active' AND NEW.email IS NOT NULL THEN
    SELECT * INTO _app FROM public.applications
      WHERE lower(email) = lower(NEW.email) AND vertical IS NOT NULL
      ORDER BY created_at DESC LIMIT 1;
    IF _app.id IS NOT NULL AND EXISTS (SELECT 1 FROM public.vertical_paths WHERE vertical = _app.vertical) THEN
      INSERT INTO public.rep_vertical_enrollments
        (user_id, vertical, status, source_type, source_code, referrer_user_id, partner_id)
      VALUES (NEW.user_id, _app.vertical, 'interested', _app.source_type, _app.source_code,
              _app.referrer_user_id, _app.partner_id)
      ON CONFLICT (user_id, vertical) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enroll_vertical_on_approval ON public.profiles;
CREATE TRIGGER trg_enroll_vertical_on_approval
  AFTER UPDATE OF status ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.enroll_vertical_on_approval();

-- 5. PUBLIC INDUSTRY PAGE DATA
CREATE OR REPLACE FUNCTION public.get_public_industry(p_vertical text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _publish boolean; _result jsonb;
BEGIN
  SELECT COALESCE((SELECT value::text = 'true' FROM public.app_settings WHERE key = 'publish_stacks_publicly'), false)
    INTO _publish;

  SELECT jsonb_build_object(
    'vertical', vp.vertical,
    'label', vp.label,
    'description', vp.description,
    'carriers', COALESCE((
      SELECT jsonb_agg(c.name ORDER BY c.name)
      FROM public.carriers c
      WHERE c.vertical = vp.vertical AND c.active AND c.public
    ), '[]'::jsonb),
    'ranks', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'name', r.name,
        'value', CASE WHEN _publish THEN (
          SELECT rs.value FROM public.rank_stacks rs
          WHERE rs.rank_id = r.id AND rs.vertical = vp.vertical AND rs.confirmed
          ORDER BY rs.value DESC LIMIT 1
        ) ELSE NULL END
      ) ORDER BY r.sort_order)
      FROM public.ranks r
    ), '[]'::jsonb),
    'leads', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'full_name', p.full_name,
        'avatar_url', p.avatar_url,
        'intro', p.manager_intro
      ) ORDER BY p.full_name)
      FROM public.profiles p
      WHERE p.runs_vertical = vp.vertical AND COALESCE(p.archived,false) = false
    ), '[]'::jsonb)
  ) INTO _result
  FROM public.vertical_paths vp
  WHERE lower(vp.vertical) = lower(p_vertical);

  RETURN _result;
END;
$$;
REVOKE ALL ON FUNCTION public.get_public_industry(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_industry(text) TO anon, authenticated, service_role;

-- 6. ADMIN SOURCE REPORTING
CREATE OR REPLACE FUNCTION public.get_source_breakdown()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT jsonb_build_object(
    'applications', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT source_type, count(*)::int AS count
        FROM public.applications GROUP BY source_type ORDER BY 2 DESC
      ) x), '[]'::jsonb),
    'leads', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT source_type, count(*)::int AS count
        FROM public.recruiting_leads GROUP BY source_type ORDER BY 2 DESC
      ) x), '[]'::jsonb),
    'partners', COALESCE((
      SELECT jsonb_agg(x) FROM (
        SELECT pa.id, pa.name, pa.code, pa.active,
          (SELECT count(*)::int FROM public.applications a WHERE a.partner_id = pa.id) AS applications,
          (SELECT count(*)::int FROM public.rep_vertical_enrollments e WHERE e.partner_id = pa.id) AS enrollments
        FROM public.partners pa ORDER BY pa.name
      ) x), '[]'::jsonb)
  ) INTO _res;
  RETURN _res;
END;
$$;
REVOKE ALL ON FUNCTION public.get_source_breakdown() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_source_breakdown() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_partner_referrals(p_partner_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _res jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner')) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(x ORDER BY x.name), '[]'::jsonb) INTO _res FROM (
    SELECT a.full_name AS name, a.email, a.vertical, a.created_at,
      CASE
        WHEN p.archived THEN 'departed'
        WHEN p.status::text = 'active' AND EXISTS (
          SELECT 1 FROM public.rep_vertical_enrollments e
          WHERE e.user_id = p.user_id AND e.status = 'active'
        ) THEN 'active'
        WHEN p.status::text = 'active' THEN 'onboarding'
        WHEN p.user_id IS NOT NULL THEN 'onboarding'
        ELSE 'applied'
      END AS stage
    FROM public.applications a
    LEFT JOIN public.profiles p ON lower(p.email) = lower(a.email)
    WHERE a.partner_id = p_partner_id
  ) x;
  RETURN _res;
END;
$$;
REVOKE ALL ON FUNCTION public.get_partner_referrals(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_partner_referrals(uuid) TO authenticated, service_role;

-- 7. SEED PUBLIC DESCRIPTIONS
UPDATE public.vertical_paths SET description = 'Door-to-door pest control. The summer product. You close, you get paid on what you close.', updated_at = now() WHERE vertical = 'Pest';
UPDATE public.vertical_paths SET description = 'Door-to-door fiber internet. The winter product. Paid per install. Sells year-round.', updated_at = now() WHERE vertical = 'Fiber';
UPDATE public.vertical_paths SET description = 'Life insurance. The career product for reps who want off the doors. Requires a state license to sell. The setup path will walk you through it once it''s published.', updated_at = now() WHERE vertical = 'Life';