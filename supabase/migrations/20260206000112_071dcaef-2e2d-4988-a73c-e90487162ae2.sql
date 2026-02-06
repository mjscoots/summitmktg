-- Update the validate_and_record_quiz function to require 100% score to pass
-- Also return detailed question-by-question results for the UI

CREATE OR REPLACE FUNCTION public.validate_and_record_quiz(_lesson_id uuid, _answers jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  correct_count INT := 0;
  total_count INT;
  score INT;
  passed BOOLEAN;
  current_attempts INT;
  already_passed BOOLEAN := FALSE;
  q RECORD;
  question_results JSONB := '[]'::jsonb;
BEGIN
  -- Validate user is authenticated
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  -- Check if already passed
  SELECT quiz_passed INTO already_passed
  FROM lesson_progress
  WHERE user_id = auth.uid() AND lesson_id = _lesson_id;

  -- Build question results with correct/incorrect status
  FOR q IN 
    SELECT id, question_text, correct_answer, explanation
    FROM quiz_questions
    WHERE lesson_id = _lesson_id
    ORDER BY display_order
  LOOP
    DECLARE
      user_answer TEXT := _answers->>q.id::text;
      is_correct BOOLEAN := (user_answer = q.correct_answer);
    BEGIN
      IF is_correct THEN
        correct_count := correct_count + 1;
      END IF;
      
      -- Add to results array
      question_results := question_results || jsonb_build_object(
        'question_id', q.id,
        'question_text', q.question_text,
        'user_answer', user_answer,
        'correct_answer', q.correct_answer,
        'is_correct', is_correct,
        'explanation', COALESCE(q.explanation, '')
      );
    END;
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
  
  -- CRITICAL: Require 100% to pass
  passed := (correct_count = total_count);

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
    'total', total_count,
    'results', question_results
  );
END;
$function$;