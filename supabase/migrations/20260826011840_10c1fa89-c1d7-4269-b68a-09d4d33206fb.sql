CREATE OR REPLACE FUNCTION public.guard_confirm_flag()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.confirmed IS DISTINCT FROM OLD.confirmed
     AND NOT (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'Owner confirms pay ladder rows';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rank_stacks_confirm_guard ON public.rank_stacks;
CREATE TRIGGER trg_rank_stacks_confirm_guard
  BEFORE UPDATE ON public.rank_stacks
  FOR EACH ROW EXECUTE FUNCTION public.guard_confirm_flag();

DROP TRIGGER IF EXISTS trg_rank_requirements_confirm_guard ON public.rank_requirements;
CREATE TRIGGER trg_rank_requirements_confirm_guard
  BEFORE UPDATE ON public.rank_requirements
  FOR EACH ROW EXECUTE FUNCTION public.guard_confirm_flag();

DROP POLICY IF EXISTS "rank_stacks president edits own vertical" ON public.rank_stacks;
CREATE POLICY "rank_stacks president edits own vertical" ON public.rank_stacks
  FOR UPDATE TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

DROP POLICY IF EXISTS "rank_stacks president reads own vertical" ON public.rank_stacks;
CREATE POLICY "rank_stacks president reads own vertical" ON public.rank_stacks
  FOR SELECT TO authenticated
  USING (public.is_president_of_vertical(vertical));

DROP POLICY IF EXISTS "rank_requirements president edits own vertical" ON public.rank_requirements;
CREATE POLICY "rank_requirements president edits own vertical" ON public.rank_requirements
  FOR UPDATE TO authenticated
  USING (vertical IS NOT NULL AND public.is_president_of_vertical(vertical))
  WITH CHECK (vertical IS NOT NULL AND public.is_president_of_vertical(vertical));

DROP POLICY IF EXISTS "rank_requirements president reads own vertical" ON public.rank_requirements;
CREATE POLICY "rank_requirements president reads own vertical" ON public.rank_requirements
  FOR SELECT TO authenticated
  USING (vertical IS NOT NULL AND public.is_president_of_vertical(vertical));

REVOKE ALL ON FUNCTION public.guard_confirm_flag() FROM PUBLIC, anon;