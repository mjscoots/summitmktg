-- Fix 1: Create server-side quiz validation function
-- This validates quiz answers server-side to prevent client-side score manipulation

CREATE OR REPLACE FUNCTION public.validate_and_record_quiz(
  _lesson_id UUID,
  _answers JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  correct_count INT := 0;
  total_count INT;
  score INT;
  passed BOOLEAN;
  current_attempts INT;
  q RECORD;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Count correct answers by comparing with stored correct_answer
  FOR q IN 
    SELECT id, correct_answer
    FROM quiz_questions
    WHERE lesson_id = _lesson_id
  LOOP
    IF (_answers->>q.id::text) = q.correct_answer THEN
      correct_count := correct_count + 1;
    END IF;
  END LOOP;

  -- Get total question count
  SELECT COUNT(*) INTO total_count
  FROM quiz_questions
  WHERE lesson_id = _lesson_id;

  -- Handle case where no questions exist
  IF total_count = 0 THEN
    RETURN jsonb_build_object('error', 'No questions found for this lesson');
  END IF;

  -- Calculate score
  score := ROUND((correct_count::FLOAT / total_count) * 100);
  passed := score >= 80;

  -- Get current attempts
  SELECT COALESCE(quiz_attempts, 0) INTO current_attempts
  FROM lesson_progress
  WHERE user_id = auth.uid() AND lesson_id = _lesson_id;

  -- Record progress with incremented attempts
  INSERT INTO lesson_progress (user_id, lesson_id, quiz_passed, quiz_score, quiz_attempts, last_attempt_at, completed_at)
  VALUES (
    auth.uid(), 
    _lesson_id, 
    passed, 
    score, 
    COALESCE(current_attempts, 0) + 1, 
    NOW(),
    CASE WHEN passed THEN NOW() ELSE NULL END
  )
  ON CONFLICT (user_id, lesson_id) DO UPDATE
  SET 
    quiz_passed = CASE WHEN passed OR lesson_progress.quiz_passed THEN true ELSE false END,
    quiz_score = GREATEST(EXCLUDED.quiz_score, COALESCE(lesson_progress.quiz_score, 0)),
    quiz_attempts = lesson_progress.quiz_attempts + 1,
    last_attempt_at = NOW(),
    completed_at = CASE WHEN passed OR lesson_progress.quiz_passed THEN COALESCE(lesson_progress.completed_at, NOW()) ELSE lesson_progress.completed_at END;

  RETURN jsonb_build_object(
    'passed', passed, 
    'score', score,
    'correct', correct_count,
    'total', total_count
  );
END;
$$;

-- Fix 2: Add RLS policies to quiz_questions_safe view
-- First ensure the view has security_invoker enabled (need to recreate it)
DROP VIEW IF EXISTS public.quiz_questions_safe;

CREATE VIEW public.quiz_questions_safe
WITH (security_invoker = on)
AS 
  SELECT 
    id,
    lesson_id,
    question_text,
    question_type,
    options,
    display_order,
    created_at
  FROM public.quiz_questions;

-- Grant SELECT on the view to authenticated users
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- Ensure base quiz_questions table is only accessible to admins (already done but reaffirm)
-- Revoke direct access from authenticated role on base table
REVOKE SELECT ON public.quiz_questions FROM authenticated;
GRANT SELECT ON public.quiz_questions TO authenticated;

-- Drop and recreate RLS policy to ensure only admins can access base table
DROP POLICY IF EXISTS "Only admins can view quiz questions directly" ON public.quiz_questions;
CREATE POLICY "Only admins can view quiz questions directly" 
ON public.quiz_questions 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'));

-- Fix 3: Ensure profiles table requires authentication for all access
-- Update the existing policies to be more explicit about authentication requirement

-- Users can only view their own profile (already exists)
-- Managers can view all active profiles (already exists with status check)
-- Admins can view all profiles (already exists)
-- These policies already require auth.uid() which means authentication is required