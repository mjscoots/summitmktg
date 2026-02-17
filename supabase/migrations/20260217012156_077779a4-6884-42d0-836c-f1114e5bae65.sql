
-- Add quiz questions for lessons missing quizzes in Learn Your Pitch course
-- Each regular lesson gets 2-3 comprehension questions
-- Mastery Check lessons get 4-5 thorough questions

-- Welcome lesson
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('b1c2d3e4-0001-4000-8000-000000000001', 'What is the most important foundation before learning scripts?', 'multiple_choice', '[{"id":"a","text":"Memorizing every word"},{"id":"b","text":"Mindset and attitude"},{"id":"c","text":"Knowing product pricing"}]', 'b', 0),
('b1c2d3e4-0001-4000-8000-000000000001', 'What should you focus on growing during this training?', 'multiple_choice', '[{"id":"a","text":"Only sales skills"},{"id":"b","text":"Both as a salesperson and as a person"},{"id":"c","text":"Only product knowledge"}]', 'b', 1);

-- Fresh Accounts Explained
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('b1c2d3e4-0002-4000-8000-000000000002', 'What is a fresh account?', 'multiple_choice', '[{"id":"a","text":"A homeowner switching from another company"},{"id":"b","text":"A homeowner who does not currently have pest control"},{"id":"c","text":"A commercial property"}]', 'b', 0),
('b1c2d3e4-0002-4000-8000-000000000002', 'When selling to a fresh account, what are you introducing?', 'multiple_choice', '[{"id":"a","text":"An upgrade from their current service"},{"id":"b","text":"Pest control for the first time"},{"id":"c","text":"A price match guarantee"}]', 'b', 1);

-- Switchover Accounts Explained
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('b1c2d3e4-0003-4000-8000-000000000003', 'What is a switchover account?', 'multiple_choice', '[{"id":"a","text":"A homeowner with no pest control"},{"id":"b","text":"A homeowner who already has pest control service"},{"id":"c","text":"A brand new neighborhood"}]', 'b', 0),
('b1c2d3e4-0003-4000-8000-000000000003', 'When selling to a switchover, you are selling:', 'multiple_choice', '[{"id":"a","text":"Pest control from scratch"},{"id":"b","text":"An upgrade from their current provider"},{"id":"c","text":"A completely different product"}]', 'b', 1);

-- Universal Door Intro
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('c1d2e3f4-0001-4000-8000-000000000001', 'What is the first goal of the Universal Door Intro?', 'multiple_choice', '[{"id":"a","text":"Close the sale immediately"},{"id":"b","text":"Establish relevance using neighborhood context"},{"id":"c","text":"Hand over a brochure"}]', 'b', 0),
('c1d2e3f4-0001-4000-8000-000000000001', 'The Universal Door Intro is used for:', 'multiple_choice', '[{"id":"a","text":"Only fresh accounts"},{"id":"b","text":"Only switchover accounts"},{"id":"c","text":"Every conversation at the door"}]', 'c', 1);

-- Fresh & DIY Pitch
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('c1d2e3f4-0002-4000-8000-000000000002', 'The fresh account pitch must be:', 'multiple_choice', '[{"id":"a","text":"Read from a card at the door"},{"id":"b","text":"Memorized before entering market"},{"id":"c","text":"Improvised based on mood"}]', 'b', 0),
('c1d2e3f4-0002-4000-8000-000000000002', 'Who is the fresh pitch designed for?', 'multiple_choice', '[{"id":"a","text":"Homeowners already with pest control"},{"id":"b","text":"Homeowners hearing about professional service for the first time"},{"id":"c","text":"Commercial clients only"}]', 'b', 1);

-- Switchover Script
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('c1d2e3f4-0003-4000-8000-000000000003', 'When dealing with switchovers, should you bash competitors?', 'multiple_choice', '[{"id":"a","text":"Yes, always point out their flaws"},{"id":"b","text":"Never — you win by outclassing, not trashing"},{"id":"c","text":"Only if the customer complains first"}]', 'b', 0),
('c1d2e3f4-0003-4000-8000-000000000003', 'The switchover pitch targets homeowners who:', 'multiple_choice', '[{"id":"a","text":"Have never heard of pest control"},{"id":"b","text":"Already have pest control service"},{"id":"c","text":"Just moved into a new home"}]', 'b', 1);

-- Script Mastery Check
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('c1d2e3f4-0004-4000-8000-000000000004', 'What should every door conversation start with?', 'multiple_choice', '[{"id":"a","text":"Asking about their current provider"},{"id":"b","text":"The Universal Door Intro"},{"id":"c","text":"Handing them a price sheet"}]', 'b', 0),
('c1d2e3f4-0004-4000-8000-000000000004', 'For a fresh account, you are introducing:', 'multiple_choice', '[{"id":"a","text":"A switch from their current provider"},{"id":"b","text":"Pest control for the first time"},{"id":"c","text":"A discount program"}]', 'b', 1),
('c1d2e3f4-0004-4000-8000-000000000004', 'When selling switchovers, your approach should be:', 'multiple_choice', '[{"id":"a","text":"Aggressive and competitive"},{"id":"b","text":"Professional — outclass, don''t trash"},{"id":"c","text":"Indifferent to their current provider"}]', 'b', 2),
('c1d2e3f4-0004-4000-8000-000000000004', 'Scripts should be:', 'multiple_choice', '[{"id":"a","text":"Read word-for-word from your phone"},{"id":"b","text":"Memorized and delivered naturally"},{"id":"c","text":"Made up on the spot"}]', 'b', 3);

-- Body Language Training
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('c1d2e3f4-0005-4000-8000-000000000005', 'Why is body language important in sales?', 'multiple_choice', '[{"id":"a","text":"It doesn''t matter — words are everything"},{"id":"b","text":"People read your nonverbal cues before your words"},{"id":"c","text":"It only matters on video calls"}]', 'b', 0),
('c1d2e3f4-0005-4000-8000-000000000005', 'What is the ideal posture at the door?', 'multiple_choice', '[{"id":"a","text":"Leaning against the door frame"},{"id":"b","text":"Confident, open, and approachable"},{"id":"c","text":"Hands in pockets, relaxed"}]', 'b', 1);

-- Body Language Mastery Check
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('4fc1f4ca-2a3a-43d8-a356-c6bcc879919a', 'Crossed arms during a pitch signal:', 'multiple_choice', '[{"id":"a","text":"Confidence and control"},{"id":"b","text":"Defensiveness or disinterest"},{"id":"c","text":"Readiness to close"}]', 'b', 0),
('4fc1f4ca-2a3a-43d8-a356-c6bcc879919a', 'Eye contact should be:', 'multiple_choice', '[{"id":"a","text":"Avoided to seem humble"},{"id":"b","text":"Natural and confident — not staring"},{"id":"c","text":"Constant and intense"}]', 'b', 1),
('4fc1f4ca-2a3a-43d8-a356-c6bcc879919a', 'Your body language should convey:', 'multiple_choice', '[{"id":"a","text":"Desperation for a sale"},{"id":"b","text":"Confidence, trust, and authority"},{"id":"c","text":"Casual indifference"}]', 'b', 2),
('4fc1f4ca-2a3a-43d8-a356-c6bcc879919a', 'Mirroring the customer''s body language:', 'multiple_choice', '[{"id":"a","text":"Is weird and should be avoided"},{"id":"b","text":"Builds rapport and trust subconsciously"},{"id":"c","text":"Only works with managers"}]', 'b', 3);

-- Tonality Mastery Check
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('95b8a773-d224-4f80-b310-21f2335b1664', 'How you say something matters more than:', 'multiple_choice', '[{"id":"a","text":"Your body language"},{"id":"b","text":"What you actually say"},{"id":"c","text":"Your appearance"}]', 'b', 0),
('95b8a773-d224-4f80-b310-21f2335b1664', 'An assumptive tone is best used when:', 'multiple_choice', '[{"id":"a","text":"You''re asking questions"},{"id":"b","text":"You''re closing"},{"id":"c","text":"You''re saying goodbye"}]', 'b', 1),
('95b8a773-d224-4f80-b310-21f2335b1664', 'Which tone should you use during your intro?', 'multiple_choice', '[{"id":"a","text":"Monotone and serious"},{"id":"b","text":"Friendly and approachable"},{"id":"c","text":"Loud and aggressive"}]', 'b', 2),
('95b8a773-d224-4f80-b310-21f2335b1664', 'Varying your tonality helps to:', 'multiple_choice', '[{"id":"a","text":"Confuse the customer"},{"id":"b","text":"Keep the customer engaged and maintain control"},{"id":"c","text":"Show you''re nervous"}]', 'b', 3);

-- Objections Mastery Check
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('6dea78f8-150f-4d70-849d-68558870872e', 'After the price sheet, what should you expect?', 'multiple_choice', '[{"id":"a","text":"An immediate yes"},{"id":"b","text":"Objections — they''re normal"},{"id":"c","text":"The homeowner to walk away"}]', 'b', 0),
('6dea78f8-150f-4d70-849d-68558870872e', 'When an objection comes up, the key is to:', 'multiple_choice', '[{"id":"a","text":"Argue until they agree"},{"id":"b","text":"Stay calm, keep control, and move them forward"},{"id":"c","text":"Give up and move on"}]', 'b', 1),
('6dea78f8-150f-4d70-849d-68558870872e', 'The best way to handle "I need to think about it" is:', 'multiple_choice', '[{"id":"a","text":"Say okay and leave"},{"id":"b","text":"Acknowledge, then redirect to value"},{"id":"c","text":"Pressure them harder"}]', 'b', 2),
('6dea78f8-150f-4d70-849d-68558870872e', 'An objection is really:', 'multiple_choice', '[{"id":"a","text":"A hard no"},{"id":"b","text":"A request for more information or reassurance"},{"id":"c","text":"A reason to end the conversation"}]', 'b', 3);

-- Environmental Close
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('721101e0-4358-4f67-81ce-ca7334dfed7d', 'The environmental close uses:', 'multiple_choice', '[{"id":"a","text":"Memorized scripts only"},{"id":"b","text":"The customer''s surroundings to create urgency"},{"id":"c","text":"Discount offers"}]', 'b', 0),
('721101e0-4358-4f67-81ce-ca7334dfed7d', 'When doing a backyard pitch, you should:', 'multiple_choice', '[{"id":"a","text":"Stay at the front door"},{"id":"b","text":"Point out real pest evidence in their environment"},{"id":"c","text":"Make up problems you see"}]', 'b', 1);

-- Closing Mastery Check
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('f73d76b1-88b5-47d1-8df4-bc89a3d76d89', 'ABC stands for:', 'multiple_choice', '[{"id":"a","text":"Always Be Careful"},{"id":"b","text":"Always Be Closing"},{"id":"c","text":"Always Be Curious"}]', 'b', 0),
('f73d76b1-88b5-47d1-8df4-bc89a3d76d89', 'Hard closes should only be used:', 'multiple_choice', '[{"id":"a","text":"At the very start"},{"id":"b","text":"After objections are handled and resistance is gone"},{"id":"c","text":"Never"}]', 'b', 1),
('f73d76b1-88b5-47d1-8df4-bc89a3d76d89', 'The environmental close is effective because:', 'multiple_choice', '[{"id":"a","text":"It uses visual proof from their own property"},{"id":"b","text":"It relies on memorized statistics"},{"id":"c","text":"It avoids talking about pests"}]', 'a', 2),
('f73d76b1-88b5-47d1-8df4-bc89a3d76d89', 'When closing, your tone should be:', 'multiple_choice', '[{"id":"a","text":"Hesitant and questioning"},{"id":"b","text":"Assumptive and confident"},{"id":"c","text":"Loud and demanding"}]', 'b', 3);

-- Course Wrap-Up
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('277057f8-6579-4293-a1bf-f81ea4f590dc', 'What is the key to success in the field?', 'multiple_choice', '[{"id":"a","text":"Luck"},{"id":"b","text":"Consistent practice and applying what you learned"},{"id":"c","text":"Having the best territory"}]', 'b', 0),
('277057f8-6579-4293-a1bf-f81ea4f590dc', 'After completing this course, your next step should be:', 'multiple_choice', '[{"id":"a","text":"Wait for your manager to tell you what to do"},{"id":"b","text":"Practice scripts and get to the doors"},{"id":"c","text":"Take a week off"}]', 'b', 1);

-- The Universal Door Intro (detailed module)
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('0d5982cd-447e-4d2a-8994-41e834afb5e9', 'The pivot question in the door intro helps you:', 'multiple_choice', '[{"id":"a","text":"Stall for time"},{"id":"b","text":"Transition into the pitch naturally"},{"id":"c","text":"Confuse the customer"}]', 'b', 0),
('0d5982cd-447e-4d2a-8994-41e834afb5e9', 'The universal intro should feel:', 'multiple_choice', '[{"id":"a","text":"Scripted and robotic"},{"id":"b","text":"Natural and conversational"},{"id":"c","text":"Rushed and urgent"}]', 'b', 1);

-- The Complete Basic Pitch
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('ca35bfd4-a185-4668-aac7-a5e97f055330', 'The basic pitch should be delivered:', 'multiple_choice', '[{"id":"a","text":"Word for word from a card"},{"id":"b","text":"Naturally but hitting all key points"},{"id":"c","text":"Differently every time"}]', 'b', 0),
('ca35bfd4-a185-4668-aac7-a5e97f055330', 'What comes after the intro in the basic pitch?', 'multiple_choice', '[{"id":"a","text":"Immediately ask for the sale"},{"id":"b","text":"Build value and establish need"},{"id":"c","text":"Leave a brochure and walk away"}]', 'b', 1);

-- Converting DIY Customers
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('7d23dca6-7142-4504-bf90-0ce9420df7c1', 'DIY customers need to understand:', 'multiple_choice', '[{"id":"a","text":"That their approach is totally wrong"},{"id":"b","text":"The value professional service adds beyond what they can do"},{"id":"c","text":"That pests are not a real problem"}]', 'b', 0),
('7d23dca6-7142-4504-bf90-0ce9420df7c1', 'When approaching a DIY customer, avoid:', 'multiple_choice', '[{"id":"a","text":"Being respectful of their efforts"},{"id":"b","text":"Making them feel stupid for doing it themselves"},{"id":"c","text":"Explaining professional benefits"}]', 'b', 1);

-- The Complete Switchover Pitch
INSERT INTO quiz_questions (lesson_id, question_text, question_type, options, correct_answer, display_order) VALUES
('6956267f-eb29-4a23-affb-c9bbb540a063', 'The switchover pitch focuses on:', 'multiple_choice', '[{"id":"a","text":"Why their current company is terrible"},{"id":"b","text":"The superior value and service you offer"},{"id":"c","text":"Offering a lower price only"}]', 'b', 0),
('6956267f-eb29-4a23-affb-c9bbb540a063', 'When a switchover customer says they''re happy with their current provider:', 'multiple_choice', '[{"id":"a","text":"Give up immediately"},{"id":"b","text":"Acknowledge, then introduce what they might be missing"},{"id":"c","text":"Tell them their provider is bad"}]', 'b', 1);
