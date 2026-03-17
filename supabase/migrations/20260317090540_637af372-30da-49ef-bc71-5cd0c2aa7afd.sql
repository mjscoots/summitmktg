
-- Create announcement_posts table
CREATE TABLE public.announcement_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'update',
  cta_label TEXT,
  cta_target TEXT,
  is_pinned BOOLEAN NOT NULL DEFAULT false,
  is_important BOOLEAN NOT NULL DEFAULT false,
  is_auto_generated BOOLEAN NOT NULL DEFAULT false,
  source_type TEXT,
  source_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.announcement_posts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read published announcements
CREATE POLICY "Anyone can view published announcements"
  ON public.announcement_posts FOR SELECT TO authenticated
  USING (status = 'published' AND (expires_at IS NULL OR expires_at > now()));

-- Admins/owners can do everything via has_role
CREATE POLICY "Admins can manage announcements"
  ON public.announcement_posts FOR ALL TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner')
  );

-- Trigger for updated_at
CREATE TRIGGER update_announcement_posts_updated_at
  BEFORE UPDATE ON public.announcement_posts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to auto-generate video upload announcements
CREATE OR REPLACE FUNCTION public.auto_announce_video_upload()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _recent_ann_id UUID;
  _recent_count INTEGER;
  _window INTERVAL := '30 minutes';
BEGIN
  -- Check if there's a recent auto-generated video announcement within the window
  SELECT id INTO _recent_ann_id
  FROM announcement_posts
  WHERE is_auto_generated = true
    AND source_type = 'video_upload'
    AND created_at > (now() - _window)
    AND status IN ('draft', 'published')
  ORDER BY created_at DESC
  LIMIT 1;

  IF _recent_ann_id IS NOT NULL THEN
    -- Update existing announcement to bundle
    SELECT COUNT(*) INTO _recent_count
    FROM training_videos
    WHERE is_active = true
      AND created_at > (now() - _window);

    UPDATE announcement_posts
    SET title = _recent_count || ' new training videos added',
        body = 'New videos were just uploaded to the training library. Check them out!',
        updated_at = now()
    WHERE id = _recent_ann_id;
  ELSE
    -- Create new draft announcement
    INSERT INTO announcement_posts (
      title, body, category, cta_label, cta_target,
      is_auto_generated, source_type, source_id, status
    ) VALUES (
      'New training video: ' || NEW.title,
      'A new video was added to the ' || NEW.category || ' section.',
      'training',
      'Watch now',
      '/app/videos',
      true,
      'video_upload',
      NEW.id::text,
      'draft'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger on training_videos insert
CREATE TRIGGER on_training_video_insert
  AFTER INSERT ON public.training_videos
  FOR EACH ROW
  WHEN (NEW.is_active = true)
  EXECUTE FUNCTION public.auto_announce_video_upload();
