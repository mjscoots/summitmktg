-- Add logo_url to teams table for team logos
ALTER TABLE public.teams ADD COLUMN IF NOT EXISTS logo_url text;

-- Create rep_signups table to track when reps are signed (for counter)
CREATE TABLE IF NOT EXISTS public.rep_signups (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_name text NOT NULL,
  rep_email text NOT NULL,
  rep_phone text NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  signed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  signed_at timestamp with time zone NOT NULL DEFAULT now(),
  source text DEFAULT 'interview3', -- 'interview3' or 'manual'
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on rep_signups
ALTER TABLE public.rep_signups ENABLE ROW LEVEL SECURITY;

-- RLS policies for rep_signups
CREATE POLICY "Managers can view rep signups"
ON public.rep_signups
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can insert rep signups"
ON public.rep_signups
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for rep_signups (for live notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE public.rep_signups;

-- Create manager_notifications table for real-time toast notifications
CREATE TABLE IF NOT EXISTS public.manager_notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message text NOT NULL,
  manager_name text NOT NULL,
  rep_name text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on manager_notifications
ALTER TABLE public.manager_notifications ENABLE ROW LEVEL SECURITY;

-- RLS policies for manager_notifications (all managers can view)
CREATE POLICY "Managers can view manager notifications"
ON public.manager_notifications
FOR SELECT
USING (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Managers can insert manager notifications"
ON public.manager_notifications
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'manager'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for manager_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.manager_notifications;