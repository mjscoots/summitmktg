
-- STEP 1: Deactivate duplicate modules (order 10-15) - don't delete to preserve history
UPDATE training_modules 
SET is_active = false 
WHERE course_id = 'fc336ebf-5fcd-4f10-aa50-7da12118ab98' 
AND display_order >= 10;

-- STEP 2: Deactivate the standalone "Environmental Close" module (order 6)
-- Its content will be moved to a lesson inside the Closing module
UPDATE training_modules 
SET is_active = false 
WHERE id = '95a74e89-bcc8-4738-8800-47ae24725416';

-- STEP 3: Update module order for correct structure
-- Introduction: 1, Scripts: 2, Body Language: 3, Tonality: 4, Objections: 5, Closing: 6, Conclusion: 7
UPDATE training_modules SET display_order = 1 WHERE id = 'a1b2c3d4-0001-4000-8000-000000000001'; -- Introduction
UPDATE training_modules SET display_order = 2 WHERE id = 'a1b2c3d4-0002-4000-8000-000000000002'; -- Scripts
UPDATE training_modules SET display_order = 3 WHERE id = 'a1b2c3d4-0003-4000-8000-000000000003'; -- Body Language
UPDATE training_modules SET display_order = 4 WHERE id = 'a1b2c3d4-0004-4000-8000-000000000004'; -- Tonality
UPDATE training_modules SET display_order = 5 WHERE id = 'fe541b2a-4166-4907-817f-3bce91336618'; -- Objections
UPDATE training_modules SET display_order = 6 WHERE id = '9b3d7e71-088d-45e6-9308-a9581892f874'; -- Closing
UPDATE training_modules SET display_order = 7 WHERE id = 'a1b2c3d4-0006-4000-8000-000000000006'; -- Conclusion

-- STEP 4: Add missing lessons to Introduction module
-- Intro Mastery Check
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active)
VALUES (
  gen_random_uuid(),
  'a1b2c3d4-0001-4000-8000-000000000001',
  'Intro Mastery Check 📝',
  '<div class="training-section"><h2>📝 Intro Mastery Check</h2><p>Test your knowledge of the Introduction module before moving on to Scripts.</p><p>This quiz covers:</p><ul><li>Understanding fresh vs switchover accounts</li><li>The core mindset needed for success</li><li>Basic terminology and concepts</li></ul></div>',
  3,
  true
);

-- STEP 5: Add missing lessons to Body Language module  
-- Body Language Mastery Check
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active)
VALUES (
  gen_random_uuid(),
  'a1b2c3d4-0003-4000-8000-000000000003',
  'Body Language Mastery Check 📝',
  '<div class="training-section"><h2>📝 Body Language Mastery Check</h2><p>Test your understanding of body language principles.</p><p>This quiz covers:</p><ul><li>Posture and positioning</li><li>Eye contact techniques</li><li>Gestures that build trust</li><li>Mirroring and rapport</li></ul></div>',
  1,
  true
);

-- STEP 6: Add missing lessons to Tonality module
-- Tonality Mastery Check
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active)
VALUES (
  gen_random_uuid(),
  'a1b2c3d4-0004-4000-8000-000000000004',
  'Tonality Mastery Check 📝',
  '<div class="training-section"><h2>📝 Tonality Mastery Check</h2><p>Test your understanding of vocal tonality.</p><p>This quiz covers:</p><ul><li>Pitch and pace variations</li><li>Confidence vs. pushiness</li><li>Using silence effectively</li><li>Matching energy levels</li></ul></div>',
  1,
  true
);

-- STEP 7: Add missing lessons to Objections module
-- Objections Mastery Check
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active)
VALUES (
  gen_random_uuid(),
  'fe541b2a-4166-4907-817f-3bce91336618',
  'Objections Mastery Check 📝',
  '<div class="training-section"><h2>📝 Objections Mastery Check</h2><p>Test your ability to handle common objections.</p><p>This quiz covers:</p><ul><li>Price objection responses</li><li>Timing objections</li><li>"I need to think about it" handling</li><li>The 3-step objection formula</li></ul></div>',
  1,
  true
);

-- STEP 8: Rename and reorder Closing lessons, add ABC and Environmental Close
-- First, rename the existing closing lesson to be first
UPDATE training_lessons 
SET title = 'ABC – Always Be Closing 🔒', 
    display_order = 0,
    content = '<div class="training-section"><h2>🔒 ABC – Always Be Closing</h2><p><strong>The cardinal rule of sales: Always Be Closing.</strong></p><p>This doesn''t mean being pushy or aggressive. It means that <em>every interaction</em> should naturally move the prospect toward a decision.</p><h3>What "Always Be Closing" Really Means:</h3><ul><li><strong>Assumptive Language:</strong> "When we get you set up..." not "If you decide..."</li><li><strong>Forward Movement:</strong> Every question advances the sale</li><li><strong>Trial Closes:</strong> "Does that make sense?" "Sound good so far?"</li><li><strong>Commitment Gathering:</strong> Small yeses lead to big yes</li></ul><h3>ABC in Practice:</h3><p>"I''m walking your property right now to see what we''ll be treating. Let me show you where the spiders are coming from so you know what we''ll handle for you..."</p><p><em>Notice:</em> Not "Can I walk your property?" — You''re already doing it. Assumptive close from the start.</p><h3>Key Principle:</h3><p class="highlight">If you''re not closing, you''re just having a conversation. And conversations don''t pay commissions.</p></div>'
WHERE id = 'ae225075-a6b8-40e9-b18f-e6769fa44f0e';

-- Add Environmental Close lesson to Closing module
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active)
VALUES (
  gen_random_uuid(),
  '9b3d7e71-088d-45e6-9308-a9581892f874',
  'Environmental Close 🌿',
  '<div class="training-section"><h2>🌿 Environmental Close (Backyard Pitch)</h2><p>The Environmental Close is one of the most powerful closing techniques because it uses the customer''s own environment as your selling tool.</p><h3>The Concept:</h3><p>Instead of just talking about bugs abstractly, you <strong>walk the property with the customer</strong> and point out real evidence of pest activity.</p><h3>What to Look For:</h3><ul><li>Spider webs on eaves, corners, and fences</li><li>Ant trails along foundations and cracks</li><li>Wasp nests under roof lines</li><li>Rodent droppings or entry points</li><li>Moisture areas where pests thrive</li></ul><h3>The Pitch Flow:</h3><p>"Let me show you exactly what we''ll be treating..." → Walk to the backyard → Point out specific issues → "See this right here? This is where they''re coming from. We''ll treat this entire area so they can''t get in."</p><h3>Why It Works:</h3><p>Customers can''t argue with what they can see. When you show them the webs, the trails, the nests – they sell themselves. You''re not pushing; you''re revealing.</p></div>',
  1,
  true
);

-- Add Closing Mastery Check
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active)
VALUES (
  gen_random_uuid(),
  '9b3d7e71-088d-45e6-9308-a9581892f874',
  'Closing Mastery Check 📝',
  '<div class="training-section"><h2>📝 Closing Mastery Check</h2><p>Test your closing skills before completing the course.</p><p>This quiz covers:</p><ul><li>ABC principles</li><li>Environmental close techniques</li><li>Soft to hard close progression</li><li>Reading buying signals</li></ul></div>',
  2,
  true
);

-- STEP 9: Add Conclusion lesson
INSERT INTO training_lessons (id, module_id, title, content, display_order, is_active)
VALUES (
  gen_random_uuid(),
  'a1b2c3d4-0006-4000-8000-000000000006',
  'Course Wrap-Up & Next Steps 🎓',
  '<div class="training-section"><h2>🎓 Congratulations!</h2><p>You''ve completed the Summit Sales Training program. You now have the tools to:</p><ul><li>✅ Build instant rapport with homeowners</li><li>✅ Deliver compelling pitches for fresh accounts and switchovers</li><li>✅ Use body language and tonality to establish trust</li><li>✅ Handle objections with confidence</li><li>✅ Close deals using proven techniques</li></ul><h3>🚀 Your Next Steps:</h3><ol><li><strong>Shadow a Top Rep:</strong> Spend 2-3 days observing a successful rep in the field</li><li><strong>Practice Your Pitch:</strong> Role-play with your manager until it''s second nature</li><li><strong>Hit Your First Door:</strong> Start with easy neighborhoods to build confidence</li><li><strong>Track Your Progress:</strong> Log knocks, pitches, and closes daily</li><li><strong>Review Training Weekly:</strong> Come back to refresh specific techniques</li></ol><h3>📞 Need Help?</h3><p>Your manager and pillar leader are here to support you. Don''t hesitate to reach out with questions!</p><p class="highlight"><strong>Remember:</strong> Every top rep started exactly where you are now. The difference is they kept going. You''ve got this!</p></div>',
  0,
  true
);
