-- Create team_scripts table for Module 2 team-specific scripts
CREATE TABLE public.team_scripts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  module TEXT NOT NULL CHECK (module IN ('module_2_1', 'module_2_2', 'module_2_3', 'module_2_4')),
  script_content TEXT NOT NULL DEFAULT '',
  last_edited_by UUID REFERENCES auth.users(id),
  last_edited_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(team_id, module)
);

-- Create team_resources table for team-specific training resources
CREATE TABLE public.team_resources (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  resource_name TEXT NOT NULL,
  resource_type TEXT NOT NULL CHECK (resource_type IN ('video', 'document', 'link')),
  resource_url TEXT NOT NULL,
  description TEXT,
  added_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add columns to training_videos for team-specific functionality
ALTER TABLE public.training_videos
ADD COLUMN IF NOT EXISTS team_specific BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS visible_to_teams UUID[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Enable RLS on new tables
ALTER TABLE public.team_scripts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_resources ENABLE ROW LEVEL SECURITY;

-- Enable realtime for team_scripts
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_scripts;

-- RLS policies for team_scripts
CREATE POLICY "Authenticated users can view all team scripts"
ON public.team_scripts
FOR SELECT
USING (true);

CREATE POLICY "Pillars can update their own team scripts"
ON public.team_scripts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid()
    AND p.team_id = team_scripts.team_id
    AND EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = p.team_id
      AND t.leader_id = auth.uid()
    )
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Pillars can insert their own team scripts"
ON public.team_scripts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_scripts.team_id
    AND t.leader_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete team scripts"
ON public.team_scripts
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for team_resources
CREATE POLICY "Authenticated users can view team resources"
ON public.team_resources
FOR SELECT
USING (true);

CREATE POLICY "Pillars can manage their own team resources"
ON public.team_resources
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    WHERE t.id = team_resources.team_id
    AND t.leader_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Update training_videos policies to allow pillar management
CREATE POLICY "Pillars and admins can insert training videos"
ON public.training_videos
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Pillars and admins can update training videos"
ON public.training_videos
FOR UPDATE
USING (
  has_role(auth.uid(), 'manager'::app_role)
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Admins can delete training videos"
ON public.training_videos
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));