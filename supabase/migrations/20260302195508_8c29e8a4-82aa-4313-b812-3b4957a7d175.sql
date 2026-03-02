
-- Recreate video_watch_log table
CREATE TABLE IF NOT EXISTS public.video_watch_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  video_id UUID NOT NULL REFERENCES public.training_videos(id) ON DELETE CASCADE,
  watched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  watch_duration_minutes INTEGER DEFAULT 0
);

ALTER TABLE public.video_watch_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own watch logs" ON public.video_watch_log
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can read own watch logs" ON public.video_watch_log
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_video_watch_log_user_watched ON public.video_watch_log (user_id, watched_at);

-- Recreate manual_chapter_progress table
CREATE TABLE IF NOT EXISTS public.manual_chapter_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  chapter_id TEXT NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, chapter_id)
);

ALTER TABLE public.manual_chapter_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own chapter progress" ON public.manual_chapter_progress
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_manual_chapter_user ON public.manual_chapter_progress (user_id, completed_at);

-- Migrate existing video_progress data into video_watch_log
INSERT INTO public.video_watch_log (user_id, video_id, watched_at)
SELECT user_id, video_id, COALESCE(watched_at, created_at, NOW())
FROM public.video_progress
WHERE watched = true
ON CONFLICT DO NOTHING;

-- Add cumulative_points column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cumulative_points INTEGER DEFAULT 0;
