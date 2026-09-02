CREATE TABLE public.fiber_rules (
  key text PRIMARY KEY,
  title text NOT NULL,
  body text NOT NULL,
  leader_only boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.fiber_rules TO authenticated;
GRANT ALL ON public.fiber_rules TO service_role;

ALTER TABLE public.fiber_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Fiber members read general rules" ON public.fiber_rules
  FOR SELECT TO authenticated
  USING (
    (leader_only = false AND public.is_vertical_member(auth.uid(), 'Fiber'))
    OR public.is_effective_manager(auth.uid())
  );

CREATE POLICY "Owner manages rules" ON public.fiber_rules
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'owner'))
  WITH CHECK (public.has_role(auth.uid(), 'owner'));

INSERT INTO public.fiber_rules (key, title, body, leader_only, sort_order) VALUES
  ('installs', 'Installs', 'Paid installs with Summit, across every ISP and every blitz. Cumulative. Never reset. Net of chargebacks.', false, 1),
  ('tiers', 'Tiers', 'Set at the start of each blitz from total installs. Paid on every install that blitz. No mid-blitz changes, no retro. A tier is never lost.', false, 2),
  ('floor', 'The floor', 'This ladder is the minimum. A president or manager can start a rep higher or bump him early; the difference comes out of that leader''s spread. Nobody is ever placed below it.', false, 3),
  ('entry', 'Entry', 'Rookie: first sales job. Veteran: sales experience anywhere. Fiber vets enter at the tier matching installs documented by a carrier or dealer statement. Word of mouth is not documentation.', false, 4),
  ('hold', 'Hold', 'Summit holds 10% of pay for 90 days against chargebacks, then releases it.', false, 5),
  ('chargebacks', 'Chargebacks', 'A cancel inside the carrier window is charged back at the rate the rep was paid.', false, 6),
  ('housing', 'Housing', 'Fronted by the president, deducted from pay at one install per week. Leaders at $300 and up cover their own.', false, 7),
  ('car', 'Car', 'Reps at $200 and up bring a car to market. No car and none in market: pay drops $50 per install. Rookies ride.', false, 8),
  ('bring_a_buddy', 'Bring a Buddy', 'Bring a guy in you do not run: $5 per install he does, starting at his 25th. Up to 5 referrals paying at once.', false, 9),
  ('org_stack', 'Org stack', 'The top of each ISP column. That row is the president. Leaders top out one tier under it, so the president keeps at least $25 on every rep.', true, 10),
  ('leaders', 'Leaders', 'Your override on a rep you run is your tier pay minus his, on his installs. Team tiers require running the reps, not just recruiting them.', true, 11);

CREATE OR REPLACE FUNCTION public.fiber_ladder()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _leaders boolean;
BEGIN
  IF _uid IS NULL THEN
    RETURN jsonb_build_object('can_see_leaders', false, 'carriers', '[]'::jsonb, 'rows', '[]'::jsonb);
  END IF;

  _leaders := public.is_effective_manager(_uid)
    OR public.has_role(_uid, 'admin') OR public.has_role(_uid, 'owner');

  RETURN jsonb_build_object(
    'can_see_leaders', _leaders,
    'source', public.get_setting('fiber_pay_source', NULL),
    'carriers', COALESCE((
      SELECT jsonb_agg(jsonb_build_object('carrier_id', c.id, 'name', c.name) ORDER BY c.name)
        FROM public.carriers c
       WHERE c.vertical = 'Fiber' AND c.active
    ), '[]'::jsonb),
    'rows', COALESCE((
      SELECT jsonb_agg(row_json ORDER BY sort_order)
        FROM (
          SELECT r.sort_order AS sort_order,
                 jsonb_build_object(
                   'rank_id', r.id,
                   'rank', r.name,
                   'sort_order', r.sort_order,
                   'leader', (r.sort_order > 4),
                   'values', COALESCE((
                     SELECT jsonb_object_agg(s.carrier_id::text,
                              CASE
                                WHEN r.sort_order > 4 AND NOT _leaders THEN NULL
                                WHEN s.confirmed THEN s.value
                                ELSE NULL
                              END)
                       FROM public.rank_stacks s
                       JOIN public.carriers c2 ON c2.id = s.carrier_id AND c2.active
                      WHERE s.vertical = 'Fiber' AND s.rank_id = r.id
                   ), '{}'::jsonb)
                 ) AS row_json
            FROM public.ranks r
        ) t
    ), '[]'::jsonb)
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.fiber_ladder() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.fiber_ladder() FROM anon;
GRANT EXECUTE ON FUNCTION public.fiber_ladder() TO authenticated;