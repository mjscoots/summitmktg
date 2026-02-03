-- Add assignee support to calendar_events
-- Events can be assigned to specific users OR to a manager's entire downline

-- Add columns for individual assignees and manager assignment
ALTER TABLE public.calendar_events 
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS event_type text DEFAULT 'general',
ADD COLUMN IF NOT EXISTS end_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS manager_id uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS is_team_wide boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now();

-- Create junction table for individual event assignments
CREATE TABLE IF NOT EXISTS public.calendar_event_assignees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, user_id)
);

-- Enable RLS on assignees table
ALTER TABLE public.calendar_event_assignees ENABLE ROW LEVEL SECURITY;

-- Policies for calendar_event_assignees
CREATE POLICY "Users can view their own event assignments"
ON public.calendar_event_assignees FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Managers can view all assignments for their events"
ON public.calendar_event_assignees FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events ce
    WHERE ce.id = event_id AND ce.manager_id = auth.uid()
  )
);

CREATE POLICY "Managers can insert event assignments"
ON public.calendar_event_assignees FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin')
);

CREATE POLICY "Managers can delete their own event assignments"
ON public.calendar_event_assignees FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events ce
    WHERE ce.id = event_id AND ce.manager_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin')
);

-- Create table for notification tracking
CREATE TABLE IF NOT EXISTS public.event_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notification_type text NOT NULL, -- 'email', 'push', 'in_app'
  status text DEFAULT 'pending', -- 'pending', 'sent', 'failed'
  sent_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  error_message text
);

-- Enable RLS on notifications table
ALTER TABLE public.event_notifications ENABLE ROW LEVEL SECURITY;

-- Users can view their own notifications
CREATE POLICY "Users can view own notifications"
ON public.event_notifications FOR SELECT
USING (auth.uid() = user_id);

-- Managers can view notifications for their events
CREATE POLICY "Managers can view event notifications"
ON public.event_notifications FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.calendar_events ce
    WHERE ce.id = event_id AND ce.manager_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin')
);

-- Create in-app notifications table for the notification bell
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  message text NOT NULL,
  link text,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now(),
  event_id uuid REFERENCES public.calendar_events(id) ON DELETE CASCADE
);

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own in-app notifications"
ON public.user_notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
ON public.user_notifications FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.user_notifications FOR INSERT
WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_event_assignees_event ON public.calendar_event_assignees(event_id);
CREATE INDEX IF NOT EXISTS idx_event_assignees_user ON public.calendar_event_assignees(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_user ON public.user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_unread ON public.user_notifications(user_id, is_read) WHERE is_read = false;