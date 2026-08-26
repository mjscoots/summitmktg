REVOKE ALL ON FUNCTION public.post_event_card() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_event_card() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_event_card_cancelled() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_announcement_card() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_incentive_card() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.event_target_channel(text, uuid) FROM authenticated;
REVOKE ALL ON FUNCTION public.event_card_meta(public.calendar_events) FROM authenticated;