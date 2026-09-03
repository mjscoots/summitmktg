DROP TRIGGER IF EXISTS trg_post_event_card ON public.calendar_events;

DELETE FROM public.chat_messages WHERE kind = 'event' AND is_ai = true;