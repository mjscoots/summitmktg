-- Pitch Approval Requests table
CREATE TABLE public.pitch_approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lesson_id UUID REFERENCES public.training_lessons(id) NOT NULL,
  video_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID,
  manager_feedback TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add requires_pitch_approval column to training_lessons
ALTER TABLE public.training_lessons ADD COLUMN IF NOT EXISTS requires_pitch_approval BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.pitch_approval_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own pitch requests"
ON public.pitch_approval_requests FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own pitch requests"
ON public.pitch_approval_requests FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending pitch requests"
ON public.pitch_approval_requests FOR UPDATE
USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Managers can view all pitch requests"
ON public.pitch_approval_requests FOR SELECT
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can update pitch requests"
ON public.pitch_approval_requests FOR UPDATE
USING (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin'));

-- Storage bucket for pitch videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('pitch-approval-videos', 'pitch-approval-videos', false)
ON CONFLICT DO NOTHING;

-- Storage RLS: Users upload own pitch videos (folder = user_id)
CREATE POLICY "Users upload own pitch videos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'pitch-approval-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: Users can view own pitch videos
CREATE POLICY "Users view own pitch videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pitch-approval-videos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Storage RLS: Managers can view all pitch videos
CREATE POLICY "Managers view team pitch videos"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'pitch-approval-videos' AND (has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin')));

-- Index for fast lookups
CREATE INDEX idx_pitch_approval_user_lesson ON public.pitch_approval_requests(user_id, lesson_id);
CREATE INDEX idx_pitch_approval_status ON public.pitch_approval_requests(status);
