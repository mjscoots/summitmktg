-- First, update the existing modules display order and add new Introduction module
-- Get learn-your-pitch course id: fc336ebf-5fcd-4f10-aa50-7da12118ab98

-- Create Introduction module (first section)
INSERT INTO training_modules (id, course_id, title, description, display_order, is_active)
VALUES (
  'a1b2c3d4-0001-4000-8000-000000000001',
  'fc336ebf-5fcd-4f10-aa50-7da12118ab98',
  'Introduction',
  'Welcome to Learn Your Pitch - start here',
  0,
  true
);

-- Update existing modules to have proper display order for the new structure
-- Introduction = 0 (new)
-- Scripts = 1 (Universal Door Intro becomes part of Scripts)
-- Body Language = 2 (new)
-- Tonality = 3 (new)
-- Objections = 4 (already exists as "Objection Handling Foundations")
-- Closing = 5 (already exists as "Closing Techniques")
-- Conclusion = 6 (new)

-- Create Scripts module
INSERT INTO training_modules (id, course_id, title, description, display_order, is_active)
VALUES (
  'a1b2c3d4-0002-4000-8000-000000000002',
  'fc336ebf-5fcd-4f10-aa50-7da12118ab98',
  'Scripts',
  'Master the core door scripts',
  1,
  true
);

-- Create Body Language module
INSERT INTO training_modules (id, course_id, title, description, display_order, is_active)
VALUES (
  'a1b2c3d4-0003-4000-8000-000000000003',
  'fc336ebf-5fcd-4f10-aa50-7da12118ab98',
  'Body Language',
  'Non-verbal communication mastery',
  2,
  true
);

-- Create Tonality module
INSERT INTO training_modules (id, course_id, title, description, display_order, is_active)
VALUES (
  'a1b2c3d4-0004-4000-8000-000000000004',
  'fc336ebf-5fcd-4f10-aa50-7da12118ab98',
  'Tonality',
  'Voice control and delivery',
  3,
  true
);

-- Update Objection Handling to be "Objections" at position 4
UPDATE training_modules 
SET title = 'Objections', display_order = 4
WHERE id = 'fe541b2a-4166-4907-817f-3bce91336618';

-- Update Closing Techniques to be "Closing" at position 5
UPDATE training_modules 
SET title = 'Closing', display_order = 5
WHERE id = '9b3d7e71-088d-45e6-9308-a9581892f874';

-- Create Conclusion module
INSERT INTO training_modules (id, course_id, title, description, display_order, is_active)
VALUES (
  'a1b2c3d4-0006-4000-8000-000000000006',
  'fc336ebf-5fcd-4f10-aa50-7da12118ab98',
  'Conclusion',
  'Wrap up and next steps',
  6,
  true
);

-- Move existing modules that don't fit new structure to Scripts or hide them
-- Update Universal Door Intro to be a lesson inside Scripts later
-- For now, set high display_order to push to end
UPDATE training_modules 
SET display_order = 10
WHERE id = '418176d2-bdc3-4db8-947e-d5f377775f9a';

UPDATE training_modules 
SET display_order = 11
WHERE id = '4c2d92e6-bbf7-4663-a5d8-1c9e6a2cc91f';

UPDATE training_modules 
SET display_order = 12
WHERE id = 'cc2eaaff-db1b-417f-88d3-7dc3a369d04b';

UPDATE training_modules 
SET display_order = 13
WHERE id = 'bf8a72e6-a584-421e-83f3-ceed7f57da03';

UPDATE training_modules 
SET display_order = 14
WHERE id = 'a9d87ce0-f908-43ee-aa22-49a462a70852';

UPDATE training_modules 
SET display_order = 15
WHERE id = '59f8e08f-69ee-49a4-bfbb-7d5043f02ade';

-- Now add the three Introduction lessons

-- Lesson 1: Welcome
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active, key_takeaways)
VALUES (
  'b1c2d3e4-0001-4000-8000-000000000001',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Welcome',
  E'## Welcome 👋\n\nIt''s great to have you here. I''m genuinely excited to see how much you grow—not just as a salesperson, but as a person. Let''s get started.\n\n---\n\n## Mindset Comes First 🧠\n\nBefore scripts, techniques, or strategy, understand this:\n\n**Your mindset will determine your success in door-to-door sales.**\n\nYou can have great delivery, strong communication skills, and solid body language—but without mental toughness and character, this job will wear you down. Rejection is part of the game. How you respond to it is what separates average reps from top producers.\n\n---\n\n## The Reality of the Job 🚪\n\nYou''re going to experience both extremes.\n\nSome doors will get slammed. Some people will be rude. Some days you''ll question why you''re doing this at all.\n\nOther days, homeowners will invite you in, thank you for your hustle, and tell you they respect the grind.\n\n**Door-to-door sales compresses life lessons into a short period of time—and that''s why the upside is so big.**\n\n---\n\n## This Is Not Easy — and That''s the Point\n\nIf you''re looking for comfort or something easy, this isn''t it.\n\nBut if you want to change your life, build real confidence, and develop skills that transfer into everything you do, you''re in the right place. You''ll have the tools, training, and support—you decide how far this goes.\n\n---\n\n## A Real Example 📖\n\nDuring my rookie year, I walked away from what looked like a "safe" opportunity. I was going through a divorce, had no safety net, and needed to prove something to myself.\n\nI committed fully to door-to-door pest control.\n\nThat summer, I finished top ten as a rookie, sold over $435,000 in revenue, and changed the trajectory of my life.\n\nThe money mattered—but the confidence, discipline, and belief I gained mattered more.\n\n**That same opportunity exists for you. Commit fully. Don''t quit.**\n\n---\n\n## Effort In = Results Out 📈\n\nThis job exposes effort instantly. There''s no hiding.\n\n**Ask yourself now: are you going to lean in—or watch others win?**\n\n---\n\n*Author: Joshua Bingham*',
  0,
  true,
  ARRAY['Your mindset will determine your success', 'Rejection is part of the game - how you respond matters', 'Door-to-door compresses life lessons into a short time', 'Commit fully and don''t quit']
);

-- Lesson 2: Fresh Accounts Explained
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active, key_takeaways)
VALUES (
  'b1c2d3e4-0002-4000-8000-000000000002',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Fresh Accounts Explained',
  E'## 🆕 Fresh Accounts Explained\n\n### Definition\n\nA **fresh account** is a homeowner who does not currently have pest control.\n\n- You are not switching them from another company.\n- You are introducing pest control for the first time.\n\n**This puts you in full control of the conversation.**\n\n---\n\n## Why Fresh Accounts Matter\n\n✓ No loyalty to another company\n\n✓ First exposure to professional pest control\n\n✓ You set the standard\n\n✓ Objections are simpler and predictable\n\n**Common objections:**\n- "I don''t need it"\n- "I do it myself"\n\nYou''re educating, not competing.\n\n---\n\n## How to Win Fresh Accounts\n\n1. **Create urgency:** "Since I''m already treating your neighbors…"\n\n2. **Use social proof** - reference neighbors getting service\n\n3. **Show visual proof** - pest activity, treatment areas\n\n4. **Use assumptive language** - speak as if they''re moving forward\n\n---\n\n## Key Takeaway\n\n**Educate.**\n\n**Build value.**\n\n**Set the standard.**\n\n**Assume the close.**',
  1,
  true,
  ARRAY['Fresh accounts have no current pest control', 'You are educating, not competing', 'Create urgency with neighbor proof', 'Use assumptive language']
);

-- Lesson 3: Switchover Accounts Explained
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active, key_takeaways)
VALUES (
  'b1c2d3e4-0003-4000-8000-000000000003',
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Switchover Accounts Explained',
  E'## 🔄 Switchover Accounts Explained\n\n### Definition\n\nA **switchover account** is a homeowner who already has pest control service.\n\n- You are not selling pest control.\n- **You are selling an upgrade.**\n\n---\n\n## Why Switchover Accounts Matter\n\n✓ Built-in belief - they already value pest control\n\n✓ Easier conversations - no need to sell the concept\n\n✓ Upgrade mindset - focus on better service\n\n✓ Higher retention - educated customers stay longer\n\n---\n\n## Switchover Roadmap\n\n### 1. Intro\nAssume they have service - don''t ask, state it.\n\n### 2. Thesis\nExplain why neighbors are switching: "A lot of your neighbors have been switching over to us because..."\n\n### 3. Outline / Box-In\nAsk what their current service includes. Most don''t know their own coverage.\n\n### 4. Differences\n**"Rather than just ___, we actually ___."**\n\nExamples:\n- Rather than just spraying the baseboards, we actually treat eaves and entry points\n- Rather than just quarterly, we come out every other month\n\n### 5. Close\nSquare footage → price → close\n\n---\n\n## 🚫 Never Bash Competitors\n\nYou win by outclassing, not by trashing.\n\nProfessional. Confident. Better.\n\n---\n\n## Key Takeaway\n\n**You''re selling an upgrade, not a replacement.**\n\n**Be the obvious better option.**',
  2,
  true,
  ARRAY['Switchover accounts already have service', 'You are selling an upgrade, not pest control', 'Use "Rather than..." framework', 'Never bash competitors - outclass them']
);