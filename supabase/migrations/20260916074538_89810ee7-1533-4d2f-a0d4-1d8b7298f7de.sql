ALTER TABLE public.managed_links
  ADD COLUMN IF NOT EXISTS link_scope text NOT NULL DEFAULT 'shared';

ALTER TABLE public.managed_links
  DROP CONSTRAINT IF EXISTS managed_links_scope_check;
ALTER TABLE public.managed_links
  ADD CONSTRAINT managed_links_scope_check
  CHECK (link_scope IN ('shared', 'personal'));

CREATE INDEX IF NOT EXISTS managed_links_created_by_scope_idx
  ON public.managed_links (created_by, link_scope, is_active);

CREATE OR REPLACE FUNCTION public.validate_managed_link_owner()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.link_scope = 'personal' AND NEW.created_by IS NULL THEN
    RAISE EXCEPTION 'Personal links require an owner';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_managed_link_owner_trigger ON public.managed_links;
CREATE TRIGGER validate_managed_link_owner_trigger
BEFORE INSERT OR UPDATE ON public.managed_links
FOR EACH ROW EXECUTE FUNCTION public.validate_managed_link_owner();

DROP POLICY IF EXISTS "Authenticated users can view active links" ON public.managed_links;
DROP POLICY IF EXISTS "Admins can manage links" ON public.managed_links;
DROP POLICY IF EXISTS "Managers can manage links" ON public.managed_links;
DROP POLICY IF EXISTS "Owners can manage links" ON public.managed_links;

CREATE POLICY "Users view available resource links"
ON public.managed_links FOR SELECT TO authenticated
USING (
  (link_scope = 'shared' AND is_active = true)
  OR (link_scope = 'personal' AND created_by = auth.uid())
  OR public.has_role(auth.uid(), 'admin'::public.app_role)
  OR public.has_role(auth.uid(), 'owner'::public.app_role)
);

CREATE POLICY "Users create own personal links"
ON public.managed_links FOR INSERT TO authenticated
WITH CHECK (link_scope = 'personal' AND created_by = auth.uid());

CREATE POLICY "Users update own personal links"
ON public.managed_links FOR UPDATE TO authenticated
USING (link_scope = 'personal' AND created_by = auth.uid())
WITH CHECK (link_scope = 'personal' AND created_by = auth.uid());

CREATE POLICY "Users delete own personal links"
ON public.managed_links FOR DELETE TO authenticated
USING (link_scope = 'personal' AND created_by = auth.uid());

CREATE POLICY "Managers create shared links"
ON public.managed_links FOR INSERT TO authenticated
WITH CHECK (
  link_scope = 'shared'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);

CREATE POLICY "Managers update shared links"
ON public.managed_links FOR UPDATE TO authenticated
USING (
  link_scope = 'shared'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
)
WITH CHECK (
  link_scope = 'shared'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);

CREATE POLICY "Managers delete shared links"
ON public.managed_links FOR DELETE TO authenticated
USING (
  link_scope = 'shared'
  AND (
    public.has_role(auth.uid(), 'manager'::public.app_role)
    OR public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);

CREATE POLICY "Owners manage personal links"
ON public.managed_links FOR ALL TO authenticated
USING (
  link_scope = 'personal'
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
)
WITH CHECK (
  link_scope = 'personal'
  AND created_by IS NOT NULL
  AND (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  )
);

CREATE OR REPLACE FUNCTION public.rep_progress_summary()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role(auth.uid(), 'owner'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT COALESCE(jsonb_agg(row_data ORDER BY lower(row_data->>'full_name')), '[]'::jsonb)
  INTO result
  FROM (
    SELECT jsonb_build_object(
      'user_id', p.id,
      'full_name', COALESCE(NULLIF(p.full_name, ''), 'Unnamed rep'),
      'vertical', COALESCE(p.active_vertical, p.industry, 'Unassigned'),
      'application_count', COALESCE(va.application_count, 0),
      'latest_application_status', va.latest_status,
      'applications', COALESCE(va.applications, '[]'::jsonb),
      'earnings_goal', eg.goal,
      'earnings_goal_updated_at', eg.updated_at,
      'personal_link_count', COALESCE(ml.personal_link_count, 0),
      'personal_links', COALESCE(ml.personal_links, '[]'::jsonb)
    ) AS row_data
    FROM public.profiles p
    LEFT JOIN public.earnings_goals eg ON eg.user_id = p.id
    LEFT JOIN LATERAL (
      SELECT
        count(*)::int AS application_count,
        (array_agg(a.status ORDER BY a.created_at DESC))[1] AS latest_status,
        jsonb_agg(jsonb_build_object(
          'id', a.id,
          'vertical', a.vertical,
          'status', a.status,
          'created_at', a.created_at,
          'updated_at', a.updated_at
        ) ORDER BY a.created_at DESC) AS applications
      FROM public.vertical_applications a
      WHERE a.user_id = p.id
    ) va ON true
    LEFT JOIN LATERAL (
      SELECT
        count(*)::int AS personal_link_count,
        jsonb_agg(jsonb_build_object(
          'id', l.id,
          'title', l.title,
          'url', l.url,
          'created_at', l.created_at,
          'is_active', l.is_active
        ) ORDER BY l.created_at DESC) AS personal_links
      FROM public.managed_links l
      WHERE l.created_by = p.id
        AND l.link_scope = 'personal'
        AND l.is_active = true
    ) ml ON true
    WHERE COALESCE(p.is_spectator, false) = false
  ) rows;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.rep_progress_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rep_progress_summary() TO authenticated;