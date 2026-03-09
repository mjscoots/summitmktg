
-- Daily challenges table
CREATE TABLE public.daily_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  challenge_date date NOT NULL DEFAULT (NOW() AT TIME ZONE 'America/Los_Angeles')::date,
  train_minutes_target integer NOT NULL DEFAULT 180,
  train_minutes_current integer NOT NULL DEFAULT 0,
  chat_messages_target integer NOT NULL DEFAULT 5,
  chat_messages_current integer NOT NULL DEFAULT 0,
  lessons_target integer NOT NULL DEFAULT 2,
  lessons_current integer NOT NULL DEFAULT 0,
  bonus_points integer NOT NULL DEFAULT 150,
  bonus_awarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, challenge_date)
);

ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own challenges"
  ON public.daily_challenges FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges"
  ON public.daily_challenges FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges"
  ON public.daily_challenges FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Function to get or create today's challenge
CREATE OR REPLACE FUNCTION public.get_daily_challenge(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _today date := (NOW() AT TIME ZONE 'America/Los_Angeles')::date;
  _challenge daily_challenges%ROWTYPE;
  _time_today integer;
  _chat_today integer;
  _lessons_today integer;
  _all_complete boolean;
BEGIN
  -- Upsert challenge for today
  INSERT INTO daily_challenges (user_id, challenge_date)
  VALUES (_user_id, _today)
  ON CONFLICT (user_id, challenge_date) DO NOTHING;

  -- Get current progress from real data
  SELECT COALESCE(SUM(total_minutes), 0) INTO _time_today
  FROM daily_training_time WHERE user_id = _user_id AND date = _today;

  SELECT COUNT(*)::integer INTO _chat_today
  FROM point_events WHERE user_id = _user_id AND category = 'chat'
    AND created_at >= (_today AT TIME ZONE 'America/Los_Angeles')
    AND created_at < ((_today + 1) AT TIME ZONE 'America/Los_Angeles');

  SELECT COUNT(*)::integer INTO _lessons_today
  FROM point_events WHERE user_id = _user_id AND category = 'lesson'
    AND created_at >= (_today AT TIME ZONE 'America/Los_Angeles')
    AND created_at < ((_today + 1) AT TIME ZONE 'America/Los_Angeles');

  -- Update current values
  UPDATE daily_challenges SET
    train_minutes_current = _time_today,
    chat_messages_current = _chat_today,
    lessons_current = _lessons_today,
    updated_at = now()
  WHERE user_id = _user_id AND challenge_date = _today
  RETURNING * INTO _challenge;

  -- Check if all complete and award bonus
  _all_complete := (_time_today >= _challenge.train_minutes_target 
    AND _chat_today >= _challenge.chat_messages_target 
    AND _lessons_today >= _challenge.lessons_target);

  IF _all_complete AND NOT _challenge.bonus_awarded THEN
    UPDATE daily_challenges SET bonus_awarded = true WHERE id = _challenge.id;
    PERFORM award_points_v2(_user_id, 'daily_challenge', _challenge.bonus_points, 
      jsonb_build_object('date', _today));
  END IF;

  RETURN jsonb_build_object(
    'challenge_date', _today,
    'objectives', jsonb_build_array(
      jsonb_build_object('type', 'training', 'label', 'Train ' || (_challenge.train_minutes_target / 60) || ' hours', 
        'current', _time_today, 'target', _challenge.train_minutes_target, 
        'complete', _time_today >= _challenge.train_minutes_target),
      jsonb_build_object('type', 'chat', 'label', 'Send ' || _challenge.chat_messages_target || ' chat messages',
        'current', _chat_today, 'target', _challenge.chat_messages_target,
        'complete', _chat_today >= _challenge.chat_messages_target),
      jsonb_build_object('type', 'lessons', 'label', 'Complete ' || _challenge.lessons_target || ' lessons',
        'current', _lessons_today, 'target', _challenge.lessons_target,
        'complete', _lessons_today >= _challenge.lessons_target)
    ),
    'bonus_points', _challenge.bonus_points,
    'bonus_awarded', _all_complete OR _challenge.bonus_awarded,
    'all_complete', _all_complete OR _challenge.bonus_awarded
  );
END;
$$;
