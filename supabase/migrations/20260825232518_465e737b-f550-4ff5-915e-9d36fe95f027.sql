-- Helper: is _uid the vertical lead over _rep's vertical?
CREATE OR REPLACE FUNCTION public.is_vertical_lead_of_rep(_uid uuid, _rep uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles lead
    WHERE lead.user_id = _uid
      AND COALESCE(lead.runs_vertical,false) = true
      AND COALESCE(lead.archived,false) = false
      AND (
        EXISTS (
          SELECT 1 FROM public.rep_vertical_enrollments e
          WHERE e.user_id = _rep AND e.vertical = COALESCE(lead.vertical,'Pest')
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles rep
          WHERE rep.user_id = _rep
            AND COALESCE(rep.vertical,'Pest') = COALESCE(lead.vertical,'Pest')
        )
      )
  )
$$;
REVOKE ALL ON FUNCTION public.is_vertical_lead_of_rep(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_vertical_lead_of_rep(uuid, uuid) TO authenticated, service_role;

-- Vertical leads manage their own vertical's onboarding path (including publishing it).
DROP POLICY IF EXISTS "vertical_paths_lead_write" ON public.vertical_paths;
CREATE POLICY "vertical_paths_lead_write" ON public.vertical_paths
  FOR UPDATE TO authenticated
  USING (public.is_vertical_lead(auth.uid(), vertical))
  WITH CHECK (public.is_vertical_lead(auth.uid(), vertical));

DROP POLICY IF EXISTS "vertical_steps_lead_write" ON public.vertical_steps;
CREATE POLICY "vertical_steps_lead_write" ON public.vertical_steps
  FOR ALL TO authenticated
  USING (public.is_vertical_lead(auth.uid(), vertical))
  WITH CHECK (public.is_vertical_lead(auth.uid(), vertical));

-- Vertical leads read and enter installs for anyone in their vertical.
DROP POLICY IF EXISTS "fiber_installs lead read" ON public.fiber_installs;
CREATE POLICY "fiber_installs lead read" ON public.fiber_installs
  FOR SELECT TO authenticated
  USING (public.is_vertical_lead_of_rep(auth.uid(), user_id));

DROP POLICY IF EXISTS "fiber_installs lead insert" ON public.fiber_installs;
CREATE POLICY "fiber_installs lead insert" ON public.fiber_installs
  FOR INSERT TO authenticated
  WITH CHECK (public.is_vertical_lead_of_rep(auth.uid(), user_id));

DROP POLICY IF EXISTS "fiber_installs lead update" ON public.fiber_installs;
CREATE POLICY "fiber_installs lead update" ON public.fiber_installs
  FOR UPDATE TO authenticated
  USING (public.is_vertical_lead_of_rep(auth.uid(), user_id))
  WITH CHECK (public.is_vertical_lead_of_rep(auth.uid(), user_id));

-- Vertical leads can see the people in their own vertical.
DROP POLICY IF EXISTS "Vertical leads can view their vertical" ON public.profiles;
CREATE POLICY "Vertical leads can view their vertical" ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_vertical_lead_of_rep(auth.uid(), user_id));