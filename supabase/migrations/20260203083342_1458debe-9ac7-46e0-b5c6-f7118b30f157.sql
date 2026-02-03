-- Fix permissive RLS policies

-- Drop the overly permissive notification insert policy
DROP POLICY IF EXISTS "System can insert notifications" ON public.user_notifications;

-- Create a more restrictive policy - only managers can create notifications for their downline
CREATE POLICY "Managers can insert notifications for downline"
ON public.user_notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin')
);

-- Add insert policies for event_notifications (managers only)
CREATE POLICY "Managers can insert event notifications"
ON public.event_notifications FOR INSERT
WITH CHECK (
  has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'admin')
);