
-- Boot Camp progress tracking table
CREATE TABLE public.bootcamp_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  phase_1_complete boolean NOT NULL DEFAULT false,
  phase_2_complete boolean NOT NULL DEFAULT false,
  phase_3_complete boolean NOT NULL DEFAULT false,
  bootcamp_completed boolean NOT NULL DEFAULT false,
  bootcamp_completed_at timestamp with time zone,
  phase_2_video_url text,
  phase_3_video_url text,
  commitment_start_date date,
  commitment_end_date date,
  signature_name text,
  signature_data text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.bootcamp_progress ENABLE ROW LEVEL SECURITY;

-- Users can view their own bootcamp progress
CREATE POLICY "Users can view own bootcamp progress"
ON public.bootcamp_progress FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own bootcamp progress
CREATE POLICY "Users can insert own bootcamp progress"
ON public.bootcamp_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own bootcamp progress
CREATE POLICY "Users can update own bootcamp progress"
ON public.bootcamp_progress FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can manage all bootcamp progress (for reset)
CREATE POLICY "Admins can manage all bootcamp progress"
ON public.bootcamp_progress FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Managers can view all bootcamp progress
CREATE POLICY "Managers can view all bootcamp progress"
ON public.bootcamp_progress FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_bootcamp_progress_updated_at
BEFORE UPDATE ON public.bootcamp_progress
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for bootcamp videos
INSERT INTO storage.buckets (id, name, public) VALUES ('bootcamp-videos', 'bootcamp-videos', false);

-- Storage policies for bootcamp videos
CREATE POLICY "Users can upload own bootcamp videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'bootcamp-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view own bootcamp videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'bootcamp-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all bootcamp videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'bootcamp-videos' AND has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can view all bootcamp videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'bootcamp-videos' AND has_role(auth.uid(), 'manager'::app_role));
