-- Allow authenticated users to SELECT from quiz_questions (needed for the quiz_questions_safe view)
-- The view already strips sensitive columns (correct_answer, explanation)
CREATE POLICY "Authenticated users can view quiz questions"
  ON public.quiz_questions
  FOR SELECT
  TO authenticated
  USING (true);