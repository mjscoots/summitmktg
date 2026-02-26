
CREATE TABLE public.chat_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  icon text NOT NULL DEFAULT 'Hash',
  color text NOT NULL DEFAULT 'text-muted-foreground',
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  display_order integer NOT NULL DEFAULT 100
);

ALTER TABLE public.chat_channels ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see channels
CREATE POLICY "Anyone can view active channels"
  ON public.chat_channels FOR SELECT
  USING (is_active = true);

-- Only admins can manage channels
CREATE POLICY "Admins can manage channels"
  ON public.chat_channels FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed the default channels so they're in the DB
INSERT INTO public.chat_channels (slug, label, icon, color, display_order) VALUES
  ('general', 'Feed', 'Hash', 'text-muted-foreground', 1),
  ('announcements', 'Announcements', 'Megaphone', 'text-amber-500', 2),
  ('feedback', 'Ideas', 'Lightbulb', 'text-emerald-500', 3),
  ('ai-coach', 'AI Coach', 'Sparkles', 'text-primary', 4);
