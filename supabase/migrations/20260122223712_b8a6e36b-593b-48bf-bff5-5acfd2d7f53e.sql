-- Fix security: Create view for quiz questions that excludes correct answers for non-admins
CREATE VIEW public.quiz_questions_safe
WITH (security_invoker=on) AS
  SELECT 
    id, 
    lesson_id, 
    question_text, 
    question_type, 
    options, 
    display_order, 
    created_at
  FROM public.quiz_questions;

-- Drop the permissive policy on quiz_questions
DROP POLICY IF EXISTS "Authenticated users can view quiz questions" ON public.quiz_questions;

-- Create restrictive policy - only admins can directly access quiz_questions
CREATE POLICY "Only admins can view quiz questions directly" ON public.quiz_questions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Grant SELECT on the safe view to authenticated users
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- Fix profiles table - ensure there's no unauthenticated access
-- The existing policies already require auth.uid(), but let's be explicit
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Managers can view all active profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all active profiles" ON public.profiles
  FOR SELECT TO authenticated USING (
    public.has_role(auth.uid(), 'manager') AND status != 'nlc'
  );

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));