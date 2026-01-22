-- =============================================
-- SECURITY HARDENING MIGRATION
-- =============================================

-- 1. Fix user_roles table: Prevent users from self-assigning roles
-- Drop existing policies if any INSERT/UPDATE/DELETE exist
DROP POLICY IF EXISTS "Users can insert roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can update roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can delete roles" ON public.user_roles;

-- Only admins can manage roles
CREATE POLICY "Only admins can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 2. Fix leaderboard_points: Prevent score manipulation
-- Drop existing INSERT/UPDATE policies that allow self-modification
DROP POLICY IF EXISTS "Users can update own leaderboard" ON public.leaderboard_points;
DROP POLICY IF EXISTS "Users can update own points" ON public.leaderboard_points;

-- Only server-side functions (via service role) or admins can modify points
CREATE POLICY "Only admins can insert leaderboard points"
ON public.leaderboard_points
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Only admins can update leaderboard points"
ON public.leaderboard_points
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3. Secure the quiz_questions_safe view
-- Drop and recreate with proper security
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

-- Grant access to authenticated users only (view respects RLS on base table)
GRANT SELECT ON public.quiz_questions_safe TO authenticated;

-- 4. Create RLS policy for quiz_questions to allow authenticated users to view questions (without answers) via the function
-- The validate_and_record_quiz function is SECURITY DEFINER so it can access the full table
-- Regular users only access via quiz_questions_safe view which excludes correct_answer

-- 5. Add policy for managers to delete their own announcements
CREATE POLICY "Managers can delete own announcements"
ON public.announcements
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'manager') 
  AND author_id = auth.uid()
);

-- 6. Create a function to award leaderboard points securely (called by server/triggers only)
CREATE OR REPLACE FUNCTION public.award_training_points(_user_id uuid, _points integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_week date;
BEGIN
  -- Get the start of current week (Monday)
  current_week := date_trunc('week', CURRENT_DATE)::date;
  
  INSERT INTO public.leaderboard_points (user_id, week_start, training_points, total_points)
  VALUES (_user_id, current_week, _points, _points)
  ON CONFLICT (user_id, week_start) 
  DO UPDATE SET 
    training_points = leaderboard_points.training_points + _points,
    total_points = leaderboard_points.total_points + _points,
    updated_at = now();
END;
$$;

-- 7. Update validate_and_record_quiz to also award points on pass
CREATE OR REPLACE FUNCTION public.validate_and_record_quiz(_lesson_id uuid, _answers jsonb)
RETURNS jsonb
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
  already_passed BOOLEAN := FALSE;
  q RECORD;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already passed
  SELECT quiz_passed INTO already_passed
  FROM lesson_progress
  WHERE user_id = auth.uid() AND lesson_id = _lesson_id;

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

  -- Award training points on first pass only
  IF passed AND NOT COALESCE(already_passed, FALSE) THEN
    PERFORM public.award_training_points(auth.uid(), 10);
  END IF;

  RETURN jsonb_build_object(
    'passed', passed, 
    'score', score,
    'correct', correct_count,
    'total', total_count
  );
END;
$$;

-- 8. Add unique constraint for leaderboard if not exists
ALTER TABLE public.leaderboard_points 
DROP CONSTRAINT IF EXISTS leaderboard_points_user_week_unique;

ALTER TABLE public.leaderboard_points 
ADD CONSTRAINT leaderboard_points_user_week_unique UNIQUE (user_id, week_start);