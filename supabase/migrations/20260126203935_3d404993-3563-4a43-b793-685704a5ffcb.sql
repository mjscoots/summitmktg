-- Create applications table to store Rookie and Vet applications
CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Common fields
  application_type TEXT NOT NULL CHECK (application_type IN ('rookie', 'vet')),
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  city_state TEXT NOT NULL,
  referral_source TEXT NOT NULL,
  
  -- Vet-specific fields (nullable for rookies)
  years_experience INTEGER,
  previous_company TEXT,
  
  -- Metadata
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'accepted', 'rejected')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Anyone can submit an application (no auth required)
CREATE POLICY "Anyone can submit applications"
ON public.applications
FOR INSERT
WITH CHECK (true);

-- Only admins and managers can view applications
CREATE POLICY "Admins can manage applications"
ON public.applications
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Managers can view applications"
ON public.applications
FOR SELECT
USING (public.has_role(auth.uid(), 'manager'));

-- Index for faster queries
CREATE INDEX idx_applications_type ON public.applications(application_type);
CREATE INDEX idx_applications_status ON public.applications(status);
CREATE INDEX idx_applications_created ON public.applications(created_at DESC);