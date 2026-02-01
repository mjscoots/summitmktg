-- Add policy to allow authenticated users to read quiz questions
-- This enables the quiz_questions_safe view to work for regular users
-- The safe view only exposes non-sensitive columns (excludes correct_answer, explanation)
-- Answer validation is done server-side via validate_and_record_quiz RPC
CREATE POLICY "Authenticated users can view questions for quizzes"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (true);