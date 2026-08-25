CREATE OR REPLACE FUNCTION public.my_vertical()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$ SELECT vertical FROM public.profiles WHERE user_id = auth.uid() LIMIT 1 $$;
REVOKE ALL ON FUNCTION public.my_vertical() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_vertical() TO authenticated, service_role;

DROP POLICY IF EXISTS "Managers view their vertical and their tree" ON public.profiles;
CREATE POLICY "Managers view their vertical and their tree"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
    OR auth.uid() = user_id
    OR (
      public.has_role(auth.uid(), 'manager')
      AND status <> 'nlc'
      AND (
        vertical IS NOT DISTINCT FROM public.my_vertical()
        OR EXISTS (
          SELECT 1 FROM public.downline_edges e
           WHERE e.parent_user_id = auth.uid() AND e.child_user_id = profiles.user_id
        )
        OR EXISTS (
          SELECT 1 FROM public.downline_edges e
           WHERE e.child_user_id = auth.uid() AND e.parent_user_id = profiles.user_id
        )
      )
    )
  );