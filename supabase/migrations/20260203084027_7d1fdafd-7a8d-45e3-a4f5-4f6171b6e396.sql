-- Add unique constraint for calendar_attendance if not exists
ALTER TABLE public.calendar_attendance 
ADD CONSTRAINT calendar_attendance_event_user_unique 
UNIQUE (event_id, user_id);

-- Enable realtime for user_notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_notifications;