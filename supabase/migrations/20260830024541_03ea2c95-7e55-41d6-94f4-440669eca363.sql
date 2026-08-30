DROP INDEX IF EXISTS public.user_notifications_reminder_guard;
CREATE UNIQUE INDEX user_notifications_reminder_guard
  ON public.user_notifications (user_id, event_id, reminder_window);
