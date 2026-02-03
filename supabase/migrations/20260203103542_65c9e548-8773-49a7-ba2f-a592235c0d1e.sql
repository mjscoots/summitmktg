-- Create team notifications table for welcome announcements
CREATE TABLE public.team_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('manager_only', 'team_wide')),
  signer_user_id UUID NOT NULL,
  signer_name TEXT NOT NULL,
  new_rep_name TEXT NOT NULL,
  new_rep_email TEXT,
  new_rep_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  dismissed_by_users UUID[] DEFAULT '{}'::UUID[]
);

-- Enable RLS
ALTER TABLE public.team_notifications ENABLE ROW LEVEL SECURITY;

-- Managers and admins can view team notifications
CREATE POLICY "Managers can view team notifications"
ON public.team_notifications
FOR SELECT
USING (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  -- Rookies can see team_wide notifications
  (type = 'team_wide')
);

-- Managers and admins can create notifications
CREATE POLICY "Managers can create team notifications"
ON public.team_notifications
FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager'::app_role) OR 
  has_role(auth.uid(), 'admin'::app_role)
);

-- Users can update to add themselves to dismissed list
CREATE POLICY "Users can update team notifications"
ON public.team_notifications
FOR UPDATE
USING (true)
WITH CHECK (true);

-- Enable realtime for team notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.team_notifications;

-- Create index for efficient querying
CREATE INDEX idx_team_notifications_team_id ON public.team_notifications(team_id);
CREATE INDEX idx_team_notifications_expires_at ON public.team_notifications(expires_at);