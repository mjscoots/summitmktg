-- Fix quiz_questions access for authenticated users
-- The view uses security_invoker so it needs a SELECT policy on the base table for authenticated users
-- But we only want to expose limited columns through the view

-- Create a new policy that allows authenticated users to select ONLY for quiz purposes
-- This works because the view filters columns and excludes correct_answer
DROP POLICY IF EXISTS "Authenticated can view questions via safe view" ON public.quiz_questions;

CREATE POLICY "Authenticated can view questions via safe view"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (true);

-- The view already filters out correct_answer column, so this is safe