-- REVERT: Remove the unsafe policy that exposes correct answers
DROP POLICY IF EXISTS "Authenticated users can view questions for quizzes" ON public.quiz_questions;

-- The quiz system is designed securely:
-- 1. quiz_questions_safe view: security_invoker=on, excludes correct_answer/explanation
-- 2. validate_and_record_quiz: SECURITY DEFINER function validates answers server-side
-- 3. Direct table access is admin-only via "Only admins can view quiz questions directly" policy

-- For the safe view to work, we need to allow access to the base table
-- BUT only for reading non-sensitive columns
-- Since we can't do column-level RLS, we'll use a different approach:
-- Create a SECURITY DEFINER function to fetch questions safely

CREATE OR REPLACE FUNCTION public.get_quiz_questions(_lesson_id uuid)
RETURNS TABLE (
  id uuid,
  lesson_id uuid,
  question_text text,
  question_type text,
  options jsonb,
  display_order integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id,
    lesson_id,
    question_text,
    question_type,
    options,
    display_order
  FROM quiz_questions
  WHERE lesson_id = _lesson_id
  ORDER BY display_order;
$$;