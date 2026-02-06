-- Create training_content table for CMS functionality
CREATE TABLE IF NOT EXISTS public.training_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_key TEXT NOT NULL UNIQUE,
  section_type TEXT NOT NULL CHECK (section_type IN ('text', 'video', 'script', 'feature_benefit', 'manual_section')),
  title TEXT,
  content_html TEXT,
  video_url TEXT,
  features_benefits JSONB,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  last_edited_by UUID REFERENCES auth.users(id),
  last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create content versions table for rollback capability
CREATE TABLE IF NOT EXISTS public.training_content_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.training_content(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  content_html_snapshot TEXT,
  video_url_snapshot TEXT,
  features_benefits_snapshot JSONB,
  edited_by UUID REFERENCES auth.users(id),
  edited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  change_description TEXT
);

-- Enable RLS
ALTER TABLE public.training_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_content_versions ENABLE ROW LEVEL SECURITY;

-- Everyone can read training content
CREATE POLICY "Anyone can read training content"
ON public.training_content
FOR SELECT
USING (is_active = true);

-- Only admins can modify training content
CREATE POLICY "Admins can insert training content"
ON public.training_content
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update training content"
ON public.training_content
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete training content"
ON public.training_content
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Version history policies
CREATE POLICY "Anyone can read content versions"
ON public.training_content_versions
FOR SELECT
USING (true);

CREATE POLICY "Admins can insert content versions"
ON public.training_content_versions
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_training_content_key ON public.training_content(content_key);
CREATE INDEX IF NOT EXISTS idx_training_content_versions_content_id ON public.training_content_versions(content_id);

-- Add trigger for updated_at
CREATE TRIGGER update_training_content_updated_at
BEFORE UPDATE ON public.training_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();