
-- Create user_training_achievements table for milestone badges and completion tracking
CREATE TABLE public.user_training_achievements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  badge_type TEXT NOT NULL,
  awarded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, badge_type)
);

-- Enable RLS
ALTER TABLE public.user_training_achievements ENABLE ROW LEVEL SECURITY;

-- Users can view their own achievements
CREATE POLICY "Users can view own achievements"
ON public.user_training_achievements
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own achievements
CREATE POLICY "Users can insert own achievements"
ON public.user_training_achievements
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Managers can view all achievements (for leaderboard/dashboard)
CREATE POLICY "Managers can view all achievements"
ON public.user_training_achievements
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage all achievements
CREATE POLICY "Admins can manage all achievements"
ON public.user_training_achievements
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));
