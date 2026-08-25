-- trigger-only helpers: nobody calls these directly
REVOKE ALL ON FUNCTION public.assign_ref_code_on_approval() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_profile_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_sync_badges_leads() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_sync_badges_streak() FROM PUBLIC, anon, authenticated;

-- scheduled/internal jobs: system only
REVOKE ALL ON FUNCTION public.run_notification_digest() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_milestone_badges(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.run_notification_digest() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_milestone_badges(uuid) TO service_role;

-- admin-invoked (role checked inside): signed-in only
REVOKE ALL ON FUNCTION public.finalize_season(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.finalize_season(uuid) TO authenticated;

-- signed-in only (remove anon)
REVOKE ALL ON FUNCTION public.complete_daily_drill(uuid, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.ensure_rep_ref_code(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_badges_for_users(uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.get_chat_channel_state() FROM anon;
REVOKE ALL ON FUNCTION public.get_current_season() FROM anon;
REVOKE ALL ON FUNCTION public.get_daily_drill(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_hall_of_fame() FROM anon;
REVOKE ALL ON FUNCTION public.get_incentive_progress() FROM anon;
REVOKE ALL ON FUNCTION public.get_my_ref_code() FROM anon;
REVOKE ALL ON FUNCTION public.get_team_battles() FROM anon;
REVOKE ALL ON FUNCTION public.mark_chat_channel_read(text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.my_signed_count() FROM anon;
REVOKE ALL ON FUNCTION public.notify_chat_mentions(uuid, uuid[]) FROM anon;
REVOKE ALL ON FUNCTION public.visible_chat_channels(uuid) FROM anon;