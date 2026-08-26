-- Fiber pay scale v5 (Summit_Fiber_Pay_Scale_v5, Aug 2026)
ALTER TABLE public.rank_stacks
  ADD COLUMN IF NOT EXISTS label text,
  ADD COLUMN IF NOT EXISTS sort_order integer,
  ADD COLUMN IF NOT EXISTS source text;
ALTER TABLE public.rank_stacks ALTER COLUMN rank_id DROP NOT NULL;

CREATE TEMP TABLE _lab(tier int, pay numeric, label text) ON COMMIT DROP;
INSERT INTO _lab(tier,pay,label) VALUES
(1,100,'Tier 1 · Start'),
(2,150,'Tier 2 · 50 installs'),
(3,200,'Tier 3 · 100 installs · veteran start'),
(4,250,'Tier 4 · 150 installs'),
(5,300,'Team Lead · run 4+ reps, pod does 60+ a blitz'),
(6,350,'Manager · 3 team leads, org does 300+ a blitz'),
(7,NULL,'Org stack · private deal');

DELETE FROM public.rank_requirements q
 WHERE q.from_rank_id IN (SELECT id FROM public.ranks WHERE sort_order > 7);
DELETE FROM public.ranks WHERE sort_order > 7;
UPDATE public.ranks r SET name = l.label, updated_at = now() FROM _lab l WHERE l.tier = r.sort_order;

CREATE TEMP TABLE _isp(name text, org_stack numeric) ON COMMIT DROP;
INSERT INTO _isp(name,org_stack) VALUES
('Sonic',375),('Brightspeed',375),('Fidium',375),('GoNetspeed CT',375),
('Lightcurve',325),('Surf',325),('Xfinity',325),('Ripple',325),('123NET',325),
('Astound',325),('ALLO',325),('GoNetspeed other',300),('NKTelco',300);

INSERT INTO public.carriers (vertical, name, active, public)
SELECT 'Fiber', i.name, true, true FROM _isp i
 WHERE NOT EXISTS (SELECT 1 FROM public.carriers c WHERE c.vertical='Fiber' AND c.name = i.name);

DELETE FROM public.rank_stacks WHERE vertical = 'Fiber';

-- A tier exists for an ISP only when its pay is under that ISP's org stack.
-- The top row of every column is the org stack itself.
INSERT INTO public.rank_stacks (vertical, carrier_id, rank_id, label, sort_order, value, unit, confirmed, source)
SELECT 'Fiber', c.id, r.id, l.label, l.tier,
       CASE WHEN l.tier = 7 THEN i.org_stack ELSE l.pay END,
       'per install', true, 'v5, Aug 2026'
  FROM _isp i
  JOIN public.carriers c ON c.vertical='Fiber' AND c.name = i.name
  JOIN _lab l ON (l.tier = 7 OR l.pay < i.org_stack)
  LEFT JOIN public.ranks r ON r.sort_order = l.tier;

INSERT INTO public.app_settings(key,value) VALUES ('fiber_holdback_percent','10')
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
INSERT INTO public.app_settings(key,value) VALUES ('fiber_pay_source','v5, Aug 2026')
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
INSERT INTO public.app_settings(key,value) VALUES ('fiber_pay_rules','{"installs": "Paid installs with Summit, across every ISP and every blitz. Cumulative. Never reset. Net of chargebacks.", "tiers": "Set at the start of each blitz from total installs. Paid on every install that blitz. No mid-blitz changes, no retro. A tier is never lost.", "floor": "This ladder is the minimum. A leader can start a rep higher or bump him early; the difference comes out of that leader''s spread. Nobody is ever placed below it.", "leaders": "Your override on a rep you run is your tier pay minus his, on his installs. Team tiers require running the reps, not just recruiting them.", "bring_a_buddy": "Bring a guy in you do not run: $5 per install he does, starting at his 25th. Up to 5 referrals paying at once.", "entry": "Rookie (EC1): first sales job. Veteran (EC3): sales experience anywhere. Fiber vets enter at the tier matching installs documented by a carrier or dealer statement. Word of mouth is not documentation.", "hold": "Summit holds 10% of pay for 90 days against chargebacks, then releases it.", "chargebacks": "A cancel inside the carrier window is charged back at the rate the rep was paid.", "housing": "Fronted by Summit, deducted from pay at one install per week. Leaders at $300 and up cover their own.", "car": "Reps at $200 and up bring a car to market. No car and none in market: pay drops $50 per install. Rookies ride."}')
  ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = now();
INSERT INTO public.app_settings(key,value) VALUES ('publish_stacks_publicly','false')
  ON CONFLICT (key) DO UPDATE SET value = 'false', updated_at = now();
INSERT INTO public.app_settings(key,value) VALUES ('public_fiber_starting_rate','')
  ON CONFLICT (key) DO UPDATE SET value = '', updated_at = now();