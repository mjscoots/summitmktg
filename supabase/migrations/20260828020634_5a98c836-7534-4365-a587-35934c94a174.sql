ALTER TABLE public.assistant_faq ADD COLUMN IF NOT EXISTS vertical text;

DELETE FROM public.assistant_faq WHERE vertical = 'Fiber';

INSERT INTO public.assistant_faq (question, answer, category, vertical, published, display_order) VALUES
('Where does my work live?','On Gainz (gainzops.org): blitz areas, orders, payroll. This app is for training, your team, chat and getting help.','Fiber','Fiber',true,1),
('Who do I contact for what?','Travel (flights, housing, rental cars): Julie. Pay, deductions, missing sales, Sales Raptor: Kei. Onboarding and market availability: Darby. Anything else: text the admin line and they route it. Numbers are on the contacts card.','Fiber','Fiber',true,2),
('How do I make sure I get paid on every sale?','Screenshot every sale when you make it and submit it. Screenshots are reconciled against the ISP report, so a typo on the ISP side does not cost you a commission.','Fiber','Fiber',true,3),
('When do I see my pay breakdown?','Weekly, as an itemized sheet: your payroll, the accounts you were paid on, any overrides, and any costs deducted, line by line.','Fiber','Fiber',true,4),
('How do travel costs work?','Travel is booked through Julie and fronted. Costs come out of pay as sales come in, itemized on the weekly sheet.','Fiber','Fiber',true,5),
('How are blitz areas picked?','Every area offered has rested three to four months and carries a negotiated pay stack. Before committing, always check the competitor promos in that market.','Fiber','Fiber',true,6),
('How does my team get a market?','Your manager texts the request with team size, start date and end date, per team. The portal lists areas, but text is fastest and most current.','Fiber','Fiber',true,7),
('What is expected on a blitz?','A pest schedule: out on time, eight to ten hours on the doors, about a hundred doors a day, clean houses, meetings on time, no partying.','Fiber','Fiber',true,8),
('How do I earn fresh leads?','Fresh drops go to top performers with high install quality. High quality plus volume earns the next fresh market.','Fiber','Fiber',true,9),
('The ISP report shows fewer sales than I made. What now?','That is exactly what the screenshots fix. If your count and the ISP report disagree, Gainz reconciles it and chases the difference.','Fiber','Fiber',true,10);

INSERT INTO public.app_settings (key, value) VALUES (
  'fiber_contacts',
  '[{"name":"Julie Steed","phone":"(801) 477-6441","role":"Travel — flights, housing, rental cars for blitzes"},{"name":"Kei","phone":"(801) 477-7410","role":"Payroll and Sales Raptor — pay amounts, deductions, missing sales"},{"name":"Darby Kelley","phone":"(208) 914-5763","role":"Operations — onboarding, market availability, coordination"},{"name":"General admin","phone":"(229) 660-0773","role":"Anything else, they route it"}]'
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO public.app_settings (key, value) VALUES (
  'fiber_blitzes',
  '[{"place":"Howell, Michigan (Surf)","timing":"Next week","approximate":false},{"place":"Cherryville / Gastonia, North Carolina","timing":"About a month out","approximate":true},{"place":"Illinois (Ripple)","timing":"Possible mid September","approximate":true},{"place":"Santa Rosa / Petaluma, California (Xfinity)","timing":"Being requested, not confirmed","approximate":false}]'
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();

INSERT INTO public.app_settings (key, value) VALUES (
  'fiber_join_link',
  'https://gainzops.org/invite.html?ref=c31245d2900857236a1d1758c8e663ef10f54dc7a913a873f4341876c532405a&addendum=TiUyRkE='
) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();