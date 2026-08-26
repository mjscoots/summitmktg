-- 1. Scope column on content tables (NULL = company-wide)
ALTER TABLE public.training_courses ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.training_videos ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.training_drills ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.scripts ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.team_scripts ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.team_resources ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.chat_channels ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.calendar_events ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.announcements ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.announcement_posts ADD COLUMN IF NOT EXISTS vertical text NULL;
ALTER TABLE public.season_checklist_items ADD COLUMN IF NOT EXISTS vertical text NULL;

-- 2. Backfill: existing content is Pest, except clearly company-wide rows
UPDATE public.training_courses SET vertical = 'Pest' WHERE vertical IS NULL;
UPDATE public.training_videos SET vertical = 'Pest' WHERE vertical IS NULL;
UPDATE public.training_drills SET vertical = 'Pest' WHERE vertical IS NULL;
UPDATE public.scripts SET vertical = 'Pest' WHERE vertical IS NULL;
UPDATE public.team_scripts SET vertical = 'Pest' WHERE vertical IS NULL;
UPDATE public.team_resources SET vertical = 'Pest' WHERE vertical IS NULL;
UPDATE public.season_checklist_items SET vertical = 'Pest' WHERE vertical IS NULL;

-- chat: general company channels stay company-wide
UPDATE public.chat_channels SET vertical = 'Pest'
 WHERE vertical IS NULL AND slug NOT IN ('general','announcements','random','company','summit');

-- events: company scope stays company-wide
UPDATE public.calendar_events SET vertical = 'Pest'
 WHERE vertical IS NULL AND COALESCE(scope, '') <> 'company';

-- announcements with a team target are pest-specific; untargeted stay company-wide
UPDATE public.announcements SET vertical = 'Pest'
 WHERE vertical IS NULL AND team_ids IS NOT NULL AND array_length(team_ids, 1) > 0;
UPDATE public.announcement_posts SET vertical = 'Pest'
 WHERE vertical IS NULL AND audience_team_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_training_courses_vertical ON public.training_courses(vertical);
CREATE INDEX IF NOT EXISTS idx_training_videos_vertical ON public.training_videos(vertical);
CREATE INDEX IF NOT EXISTS idx_training_drills_vertical ON public.training_drills(vertical);
CREATE INDEX IF NOT EXISTS idx_scripts_vertical ON public.scripts(vertical);
CREATE INDEX IF NOT EXISTS idx_chat_channels_vertical ON public.chat_channels(vertical);
CREATE INDEX IF NOT EXISTS idx_calendar_events_vertical ON public.calendar_events(vertical);

-- 3. Helper: is the signed-in user president of this content's scope
CREATE OR REPLACE FUNCTION public.is_president_of_vertical(_vertical text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _vertical IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.verticals v
    WHERE v.vertical = _vertical AND v.president_user_id = auth.uid()
  )
$$;

REVOKE ALL ON FUNCTION public.is_president_of_vertical(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_president_of_vertical(text) TO authenticated, service_role;

-- 4. President write access, scoped to their own workspace's content
CREATE POLICY "Presidents manage own vertical courses" ON public.training_courses
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical videos" ON public.training_videos
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical drills" ON public.training_drills
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical scripts" ON public.scripts
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical team scripts" ON public.team_scripts
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical resources" ON public.team_resources
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical channels" ON public.chat_channels
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical events" ON public.calendar_events
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical announcements" ON public.announcements
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));

CREATE POLICY "Presidents manage own vertical announcement posts" ON public.announcement_posts
  FOR ALL TO authenticated
  USING (public.is_president_of_vertical(vertical))
  WITH CHECK (public.is_president_of_vertical(vertical));