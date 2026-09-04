-- Pass 163: compensation integrity

-- 1. earnings_goals
CREATE TABLE IF NOT EXISTS public.earnings_goals (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  goal numeric,
  scenarios jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.earnings_goals TO authenticated;
GRANT ALL ON public.earnings_goals TO service_role;
REVOKE ALL ON public.earnings_goals FROM anon;

ALTER TABLE public.earnings_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "earnings_goals own row" ON public.earnings_goals;
CREATE POLICY "earnings_goals own row"
  ON public.earnings_goals FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "earnings_goals leaders read" ON public.earnings_goals;
CREATE POLICY "earnings_goals leaders read"
  ON public.earnings_goals FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
    OR public.is_leader_of(auth.uid(), user_id)
  );

-- 2. my_comp_ladder
CREATE OR REPLACE FUNCTION public.my_comp_ladder(_vertical text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _v text := COALESCE(_vertical, 'Pest');
  _leaders boolean;
  _rank_id uuid;
  _rank_order int;
  _tier_label text;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('tier_label', NULL, 'can_see_leaders', false, 'rows', '[]'::jsonb);
  END IF;

  _leaders := public.is_effective_manager(_uid)
    OR public.has_role(_uid, 'admin') OR public.has_role(_uid, 'owner');

  IF NOT _leaders AND NOT public.is_vertical_member(_uid, _v) THEN
    RETURN jsonb_build_object('tier_label', NULL, 'can_see_leaders', false, 'rows', '[]'::jsonb);
  END IF;

  SELECT rcr.rank_id INTO _rank_id
    FROM public.rep_carrier_ranks rcr
    JOIN public.carriers c ON c.id = rcr.carrier_id
   WHERE rcr.user_id = _uid AND c.vertical = _v
   ORDER BY rcr.set_at DESC NULLS LAST
   LIMIT 1;

  IF _rank_id IS NULL THEN
    SELECT p.rank_id INTO _rank_id FROM public.profiles p WHERE p.user_id = _uid;
  END IF;

  SELECT r.name, r.sort_order INTO _tier_label, _rank_order
    FROM public.ranks r WHERE r.id = _rank_id;

  IF _rank_order IS NULL AND NOT _leaders THEN
    RETURN jsonb_build_object('tier_label', NULL, 'can_see_leaders', false, 'rows', '[]'::jsonb);
  END IF;

  RETURN jsonb_build_object(
    'tier_label', _tier_label,
    'can_see_leaders', _leaders,
    'vertical', _v,
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'label', COALESCE(s.label, r.name),
               'threshold', r.name,
               'unit', s.unit,
               'value', s.value,
               'rate', CASE WHEN s.unit = 'percent' THEN s.value / 100.0 ELSE NULL END,
               'carrier', c.name,
               'leader', (r.sort_order > 4),
               'sort_order', COALESCE(s.sort_order, r.sort_order)
             ) ORDER BY r.sort_order, c.name)
        FROM public.rank_stacks s
        JOIN public.ranks r ON r.id = s.rank_id
        LEFT JOIN public.carriers c ON c.id = s.carrier_id AND c.active
       WHERE s.vertical = _v
         AND s.confirmed = true
         AND (
           (r.sort_order <= 4 AND (_rank_order IS NULL OR r.sort_order <= _rank_order))
           OR (r.sort_order > 4 AND _leaders)
         )
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.my_comp_ladder(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_comp_ladder(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.my_comp_ladder(text) TO authenticated;

-- 3. rank_stacks SELECT policy
DROP POLICY IF EXISTS "rank_stacks confirmed readable" ON public.rank_stacks;
DROP POLICY IF EXISTS "presidents read workspace stacks" ON public.rank_stacks;
DROP POLICY IF EXISTS "rank_stacks president reads own vertical" ON public.rank_stacks;
CREATE POLICY "rank_stacks confirmed in my vertical"
  ON public.rank_stacks FOR SELECT TO authenticated
  USING (
    (confirmed = true AND public.is_vertical_member(auth.uid(), vertical))
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'owner')
  );