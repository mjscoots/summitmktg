ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS appearance text NOT NULL DEFAULT 'dark';

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_appearance_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_appearance_check CHECK (appearance IN ('dark','light','system'));

CREATE TABLE IF NOT EXISTS public.mastery_checks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES public.training_modules(id) ON DELETE CASCADE,
  completed_at timestamptz NOT NULL DEFAULT now(),
  marked_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'practice',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, module_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mastery_checks TO authenticated;
GRANT ALL ON public.mastery_checks TO service_role;

ALTER TABLE public.mastery_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own mastery checks readable"
  ON public.mastery_checks FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Own mastery checks writable"
  ON public.mastery_checks FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Own mastery checks updatable"
  ON public.mastery_checks FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'manager')
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE POLICY "Staff can clear mastery checks"
  ON public.mastery_checks FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );

CREATE TRIGGER update_mastery_checks_updated_at
  BEFORE UPDATE ON public.mastery_checks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- A person records their own chapter check; a manager can record it for a rep.
CREATE OR REPLACE FUNCTION public.mark_mastery_check(_module_id uuid, _user_id uuid DEFAULT NULL, _source text DEFAULT 'practice')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target uuid := COALESCE(_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF target <> auth.uid()
     AND NOT (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'owner')) THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  INSERT INTO public.mastery_checks (user_id, module_id, marked_by, source)
  VALUES (target, _module_id, auth.uid(), COALESCE(_source, 'practice'))
  ON CONFLICT (user_id, module_id) DO UPDATE
    SET completed_at = now(), marked_by = auth.uid(), source = COALESCE(_source, 'practice'), updated_at = now();
END;
$$;

-- A person sets their own appearance preference.
CREATE OR REPLACE FUNCTION public.set_appearance(_appearance text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;
  IF _appearance NOT IN ('dark','light','system') THEN
    RAISE EXCEPTION 'invalid appearance';
  END IF;
  UPDATE public.profiles SET appearance = _appearance WHERE user_id = auth.uid();
END;
$$;

REVOKE ALL ON FUNCTION public.mark_mastery_check(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.set_appearance(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_mastery_check(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_appearance(text) TO authenticated;