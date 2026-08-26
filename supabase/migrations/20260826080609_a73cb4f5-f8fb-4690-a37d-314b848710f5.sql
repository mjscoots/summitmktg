-- 1. Auth trigger: on_auth_user_created on auth.users runs as supabase_auth_admin
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO supabase_auth_admin, postgres;

-- 2. Triggers on public tables written by anonymous (public form) submissions
GRANT EXECUTE ON FUNCTION public.harden_application_submission() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.harden_vet_lead_submission() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.harden_recruiting_lead_submission() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_recruiting_leads() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_lead() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.post_win_to_chat() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trg_sync_badges_leads() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.update_updated_at_column() TO anon, authenticated, service_role;

-- 3. Triggers on public tables written by signed-in app users
GRANT EXECUTE ON FUNCTION public.audit_profiles() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_user_roles() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.audit_vertical_paths() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.assign_ref_code_on_approval() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.enroll_vertical_on_approval() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_profile_privileged_fields() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.protect_privileged_profile_fields() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tg_staff_access_on_role() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.tg_staff_access_on_vertical() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trg_staff_workspace_access() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trg_sync_badges_streak() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_application_approved() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.notify_announcement_published() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.set_notification_delivery() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_team_chat_channel() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.guard_confirm_flag() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.freeze_event_attendance() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.derive_enrollment_source() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.autocomplete_fiber_first_install() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.auto_announce_video_upload() TO authenticated, service_role;
