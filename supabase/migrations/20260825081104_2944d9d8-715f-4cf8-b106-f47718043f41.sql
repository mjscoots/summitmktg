REVOKE ALL ON FUNCTION public.post_win_to_chat() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_team_chat_channel() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.team_channel_slug(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_channel_slug(text) TO authenticated, service_role;