-- Remove the overly permissive SELECT policy on quiz_questions
-- Users should only access via the safe view or the RPC function
DROP POLICY IF EXISTS "Authenticated can view questions via safe view" ON public.quiz_questions;