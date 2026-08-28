ALTER TABLE public.rep_vertical_enrollments
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS carrier_id uuid REFERENCES public.carriers(id) ON DELETE SET NULL;

CREATE OR REPLACE FUNCTION public.roll_reps_to_fiber(
  _rep_ids uuid[],
  _start_date date,
  _carrier_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rep uuid;
  _is_admin boolean;
  _n integer := 0;
  _label text;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  IF _start_date IS NULL THEN
    RAISE EXCEPTION 'start date required';
  END IF;

  _is_admin := public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner');

  IF NOT _is_admin AND NOT public.is_manager_tier(auth.uid()) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  IF _carrier_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.carriers WHERE id = _carrier_id AND vertical = 'Fiber'
  ) THEN
    RAISE EXCEPTION 'unknown fiber carrier';
  END IF;

  SELECT name INTO _label FROM public.carriers WHERE id = _carrier_id;

  FOREACH _rep IN ARRAY coalesce(_rep_ids, '{}'::uuid[]) LOOP
    IF NOT _is_admin THEN
      IF NOT (
        public.is_in_my_downline(_rep)
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.user_id = _rep AND p.direct_manager = auth.uid()::text
        )
      ) THEN
        RAISE EXCEPTION 'not authorized for one of the selected reps';
      END IF;
    END IF;

    INSERT INTO public.rep_vertical_enrollments
      (user_id, vertical, status, approved_at, start_date, carrier_id)
    VALUES (_rep, 'Fiber', 'approved', now(), _start_date, _carrier_id)
    ON CONFLICT (user_id, vertical) DO UPDATE
      SET start_date = EXCLUDED.start_date,
          carrier_id = coalesce(EXCLUDED.carrier_id, public.rep_vertical_enrollments.carrier_id),
          status = CASE WHEN public.rep_vertical_enrollments.status IN ('interested','applied','rejected')
                        THEN 'approved' ELSE public.rep_vertical_enrollments.status END,
          approved_at = coalesce(public.rep_vertical_enrollments.approved_at, now()),
          updated_at = now();

    INSERT INTO public.user_notifications (user_id, title, message, link)
    VALUES (
      _rep,
      'Fiber starts ' || to_char(_start_date, 'Mon FMDD'),
      coalesce('Your fiber start is set with ' || _label || '. ', 'Your fiber start is set. ')
        || 'Your installs and pay live in the Fiber workspace.',
      '/app'
    );

    _n := _n + 1;
  END LOOP;

  RETURN _n;
END;
$$;

REVOKE ALL ON FUNCTION public.roll_reps_to_fiber(uuid[], date, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.roll_reps_to_fiber(uuid[], date, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.roll_reps_to_fiber(uuid[], date, uuid) TO authenticated;