-- Add unique constraint on video_progress for upsert support
ALTER TABLE public.video_progress 
ADD CONSTRAINT video_progress_user_video_unique UNIQUE (user_id, video_id);