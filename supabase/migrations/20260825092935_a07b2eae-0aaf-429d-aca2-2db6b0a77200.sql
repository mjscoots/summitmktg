-- Normalize legacy category label
UPDATE public.scripts SET category = 'Openers' WHERE category = 'Opener';

-- Owner's real script cards
INSERT INTO public.scripts (title, category, body, display_order, is_active) VALUES
('Basic Pitch — Intro', 'Openers', $s$Hey how's it going, you're the homeowner right? (Yeah) Awesome. I take care of John and Sally down the street. It's all for the same stuff — a few of the webs up in the peaks and a couple of ants around the foundation. I'm sure you know how it gets, right? (yeah) The reason I'm stopping by is if I can get you on the same route as your neighbors… it's suuupppper cheap. (How much?) *Here, I'll show ya. (mumble this, roll into the bridge)$s$, 10, true),
('Alt Intro — 10-Second Opener', 'Openers', $s$Hey — sorry to bug ya. (Smile) I'm sure you've seen the white and green trucks buzzing around. I actually take care of Ben next door — I'm their bug guy. (Smile, point to issue) It's mainly been ants down low and spider webs up top. I have a little downtime the next hour, and if I can squeeze you in with the neighbors I can do it for quite a bit cheaper. (Silence close — let them react)$s$, 20, true),
('The Bridge', 'Bridge & Price Sheet', $s$So for some context, I don't do monthly services like most corporate companies. I just come out the first TWO months back to back, then I come out ONCE every TWO months. What's your square footage? (2400) Perfect — for a house your size this is your spray inside and outside. That'll get rid of all the ants, spiders, and your basic creepy crawlers. Most neighbors have been seeing the sugar ants — do you see those too or has it been something else? (any answer) Ok, we'll take care of those guys and keep them away from the home for you.$s$, 30, true),
('Price Sheet Flow', 'Bridge & Price Sheet', $s$"Down here is where I get expensive with my premiums."

Pitch the premium catered to the pest they mentioned (small ants → Deep Soil; big ants → Carpenter Ant).

"The premium you're going to love is ___."

Then: "Another neighborhood favorite is ___."

List a FEATURE and a BENEFIT for each.$s$, 40, true),
('Mice & Rats Treatment', 'Premiums', $s$Feature: I'll set up bait boxes and seal up any obvious entry points.
Benefit: That way those furry guys aren't running around.$s$, 50, true),
('Wasp/Hornet Removal', 'Premiums', $s$Feature: I'll scrub down the nests and treat up there to make sure the wasps won't come back.
Benefit: That way nobody is getting stung around the house.$s$, 60, true),
('De-Webbing Service', 'Premiums', $s$Feature: I'll scrub down the webs.
Benefit: That way the house is looking fresh and clean.$s$, 70, true),
('Deep Soil Treatment (Flea/Tick)', 'Premiums', $s$Feature: I'll granulate the whole yard.
Benefit: That'll flush all the bugs out of your yard so you can enjoy the outside just as much as the inside.$s$, 80, true),
('End of Price Sheet Close', 'Closes', $s$Typically if you call me… you have to pay extra for all of these. Work on your neighbors' schedule… I'm bundling all of these in… for free… Call my office and they're going to quote you $300 for a special trip… I'm not going to make you pay for a truck right down the street… obviously. So I'm waiving any start-up fees… doing it for the $189… and that's it… for everything on here, top to bottom, inside out.

"Would you want the inside sprayed as well, or just the outside? Cause it's included!"$s$, 90, true),
('Environmental Close (Backyard Pitch)', 'Closes', $s$Used when the prospect is in a non-buying state — motion creates emotion.

Step 1, break the no-zone: "I totally get it. Can I leave you with a card?" (Sure) "Man, I love the house! If you don't mind me asking, what do you do for work?" — let them talk about themselves.

Step 2, get them moving: "Hey, I was going to write a price on the card — how big is the backyard?" (I don't know) "Gotcha, let's just do this — I'll take a quick look, do a free inspection, and leave you with a solid quote. Is your gate on the left or right?" (start walking as they answer).

Step 3, identify issues and build value: "John, check this out real quick — see these ants trailing up the foundation? These guys are heading straight for the house. Ever seen them inside?" Then reclose.

Why it works: breaks the no pattern, moves the customer, shows visual proof, builds value, creates urgency, justifies the price drop.$s$, 100, true),
('Close Toolkit', 'Closes', $s$Assignment close: "Do you have a deck, BBQ, or pool?"
Light-bulb close (during a free inspection): "You're going to let me compete for your business, aren't you?"
Silence close: deliver the offer, then stop talking and let them react.$s$, 110, true),
('The Formula: Yes → Address → Close', 'Objections', $s$1) Yes — neutralize with a positive ("Yeah," "Awesome," "Totally get it").
2) Address — empathize, add a relevant feature/benefit.
3) Close — pull a close and stop talking.

Repeat as needed. Questions are NOT objections — they're signals of interest; answer concisely, then close.$s$, 120, true),
('Quick Brush-offs', 'Objections', $s$"I'm good / No thanks" → "Awesome. I figured you'd say that. The reason I'm swinging by is we just finished at your neighbor [Name]. They've been seeing the same spiders and ants — so we started doing a couple different things that are getting great results…"

"I have a company" → "Awesome. Most of your neighbors were using Aptive/Orkin — who do you use? Perfect. We're doing two things differently that are helping neighbors a ton…"

"My spouse takes care of it" → "Awesome. A lot of neighbors said the same thing. Were they using a corporate company before? Great — let me show you the two changes that are getting better results."$s$, 130, true),
('Spouse (escalation)', 'Objections', $s$First time: "Absolutely — the two main concerns your spouse will probably have are safety and service guarantee. Both are covered: safe for kids and pets, and we guarantee results. They'll definitely appreciate this." → CLOSE.

Second time: "Clearly you know your spouse best — what do you think they'd be more concerned about, the price or the quality?" → shift location, enhance value.

Third time: ask if the decision is theirs, offer to set a time to talk to the spouse directly, change setting, enhance value, reduce price.$s$, 140, true),
('Money (escalation)', 'Objections', $s$First time: "I get it — kind of crazy times. Let me ask, does this make sense? Do you like the idea?" (Yeah) "Exactly — that's why all your neighbors are working together on this route, to get these premium services for free with the guarantee included." → move, small price drop, close.

Second time: "I definitely don't want to put anyone in a hard spot over some pest control. Everyone ends up giving it a shot one time or another — I'm already here, I'll give you a free inspection." → move, build value, price drop, close.

Third time: "If the price made sense, would you work with your neighbors on this?"$s$, 150, true),
('Leave Me a Card (escalation)', 'Objections', $s$First: "Of course, I always leave one!" (move, build value, close).

Second: "For sure!" — slowly pull the card, start writing, ask 2-3 rapport questions ("Great setup here — pets or kids?"), move, price drop, close.

Third: "Absolutely! Just so I understand — is it more about the price or the service for you?" → take the roadmap their answer gives you.$s$, 160, true),
('Preemption Scripts', 'Objections', $s$Contract/frequency: "We don't come 12x a year like some companies — same 12 treatments spread over two or three years: two months back to back to break the egg cycle, then every-other-month or quarterly. Saves you money and works better."

No bugs: "Everyone's seeing spiders and ants on the outside. We get in front of it now to save money later — the neighbors are signing up for preventive maintenance."

Too expensive: "We're not the cheapest and not the most expensive — we do more and it shows. When it comes to your home, you get what you pay for."$s$, 170, true),
('Switchover Playbook', 'Objections', $s$Don't price-match right away.
1) Gather facts: who they use, how long, what they called them out for.
2) Differentiate: "I spend more time at the home and use a premium product."
3) Compete on price only if needed.

Free inspection tactic: "I can do a quick exterior inspection free to show what they're missing — you'll get a second opinion."$s$, 180, true),
('Buzz Phrases', 'Objections', $s$"We're expensive by design — more time and better products."
"You get what you pay for."
"The most expensive pest control is the one that doesn't work."
"We do half the homes so we get twice the time on each home."
"I love competing on price — when I do the half-off deal I can save you a lot."$s$, 190, true),
('Body Language & Tonality', 'Objections', $s$Confident eye contact. Statement tonality, no question upspeak. Neutralizing words immediately. Tactile resets (tuck the iPad, click the pen). No rushed speech, no fillers, no defensive posture.

Rookie mistakes: turning questions into debates, skipping the bridge, taking objections personally.$s$, 200, true)
ON CONFLICT DO NOTHING;

-- Daily drills
INSERT INTO public.training_drills (category, scenario, model_answer, display_order, is_active) VALUES
('Objections', $s$I'm good, no thanks.$s$, $s$"Awesome. I figured you'd say that. The reason I'm swinging by is we just finished at your neighbor [Name]. They've been seeing the same spiders and ants — so we started doing a couple different things that are getting great results…"$s$, 10, true),
('Objections', $s$I already have a company.$s$, $s$"Awesome. Most of your neighbors were using Aptive/Orkin — who do you use? Perfect. We're doing two things differently that are helping neighbors a ton…" Don't price-match right away: gather facts (who, how long, what they called them out for), differentiate ("I spend more time at the home and use a premium product"), compete on price only if needed.$s$, 20, true),
('Objections', $s$My spouse takes care of it.$s$, $s$"Awesome. A lot of neighbors said the same thing. Were they using a corporate company before? Great — let me show you the two changes that are getting better results."$s$, 30, true),
('Objections', $s$I need to talk to my spouse first.$s$, $s$"Absolutely — the two main concerns your spouse will probably have are safety and service guarantee. Both are covered: safe for kids and pets, and we guarantee results. They'll definitely appreciate this." → CLOSE. Second time: "Clearly you know your spouse best — what do you think they'd be more concerned about, the price or the quality?" → shift location, enhance value.$s$, 40, true),
('Objections', $s$It's too expensive.$s$, $s$"We're not the cheapest and not the most expensive — we do more and it shows. When it comes to your home, you get what you pay for." Buzz phrases: "We're expensive by design — more time and better products." "The most expensive pest control is the one that doesn't work."$s$, 50, true),
('Objections', $s$Money's tight right now.$s$, $s$"I get it — kind of crazy times. Let me ask, does this make sense? Do you like the idea?" (Yeah) "Exactly — that's why all your neighbors are working together on this route, to get these premium services for free with the guarantee included." → move, small price drop, close.$s$, 60, true),
('Objections', $s$Just leave me a card.$s$, $s$"Of course, I always leave one!" (move, build value, close). Second time: "For sure!" — slowly pull the card, start writing, ask 2-3 rapport questions ("Great setup here — pets or kids?"), move, price drop, close.$s$, 70, true),
('Objections', $s$Is this a contract?$s$, $s$"We don't come 12x a year like some companies — same 12 treatments spread over two or three years: two months back to back to break the egg cycle, then every-other-month or quarterly. Saves you money and works better."$s$, 80, true),
('Objections', $s$We don't have any bugs.$s$, $s$"Everyone's seeing spiders and ants on the outside. We get in front of it now to save money later — the neighbors are signing up for preventive maintenance."$s$, 90, true),
('Objections', $s$Now's not a good time.$s$, $s$Non-buying state — motion creates emotion. "I totally get it. Can I leave you with a card?" (Sure) "Man, I love the house! If you don't mind me asking, what do you do for work?" Then: "Hey, I was going to write a price on the card — how big is the backyard? Let's just do this — I'll take a quick look, do a free inspection, and leave you with a solid quote. Is your gate on the left or right?" (start walking as they answer), identify issues, build value, reclose.$s$, 100, true)
ON CONFLICT DO NOTHING;

-- Assistant FAQ seeds
INSERT INTO public.assistant_faq (question, answer, category, published, display_order) VALUES
('What''s the objection formula?', 'Yes → Address → Close. 1) Yes: neutralize with a positive ("Yeah," "Awesome," "Totally get it"). 2) Address: empathize and add a relevant feature/benefit. 3) Close: pull a close and stop talking. Repeat as needed. Questions are not objections — answer concisely, then close.', 'Sales method', true, 10),
('What are the 4 parts of the basic pitch?', 'Intro, Bridge, Price Sheet, Close.', 'Sales method', true, 20)
ON CONFLICT DO NOTHING;