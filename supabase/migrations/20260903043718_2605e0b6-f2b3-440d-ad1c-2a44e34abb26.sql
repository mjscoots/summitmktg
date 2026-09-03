CREATE TABLE public.chat_prefs (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  wallpaper text NOT NULL DEFAULT 'summit',
  wallpaper_path text,
  bubble text NOT NULL DEFAULT 'workspace',
  text_size text NOT NULL DEFAULT 'default',
  room_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chat_prefs_wallpaper_check CHECK (wallpaper IN ('summit','night','slate','forest','sand','ice','photo')),
  CONSTRAINT chat_prefs_bubble_check CHECK (bubble IN ('workspace','classic','ocean','graphite','ember')),
  CONSTRAINT chat_prefs_text_size_check CHECK (text_size IN ('small','default','large'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.chat_prefs TO authenticated;
GRANT ALL ON public.chat_prefs TO service_role;

ALTER TABLE public.chat_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own chat prefs are readable" ON public.chat_prefs
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Own chat prefs can be created" ON public.chat_prefs
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own chat prefs can be changed" ON public.chat_prefs
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Own chat prefs can be removed" ON public.chat_prefs
  FOR DELETE TO authenticated USING (auth.uid() = user_id);