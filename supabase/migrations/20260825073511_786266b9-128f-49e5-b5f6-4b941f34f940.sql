-- 1. Archival columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS archived boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS archived_at timestamptz,
  ADD COLUMN IF NOT EXISTS archived_reason text,
  ADD COLUMN IF NOT EXISTS pre_archive_status public.user_status;

CREATE INDEX IF NOT EXISTS idx_profiles_archived ON public.profiles (archived) WHERE archived = true;

-- 2. Patch every function that enumerates active users so archived profiles drop out
DO $mig$
DECLARE
  r record;
  d text;
BEGIN
  FOR r IN
    SELECT p.oid
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY (ARRAY[
        'get_all_time_leaderboard','get_current_leaderboard','get_global_leaderboard',
        'get_streak_leaderboard','get_quiz_leaderboard','get_training_leaderboard_panel',
        'get_recruiting_leaderboard','get_downline_from_edges','get_pillar_team_members',
        'get_user_downline','get_home_snapshot','get_announcement_seen_counts',
        'get_data_integrity_report','notify_new_lead','notify_announcement_published',
        'sweep_speed_to_lead'
      ])
  LOOP
    d := pg_get_functiondef(r.oid);

    d := replace(d, 'p.status <> ''nlc''', '(p.status <> ''nlc'' AND p.archived = false)');
    d := replace(d, 'p.status != ''nlc''', '(p.status != ''nlc'' AND p.archived = false)');
    d := replace(d, 'm.status != ''nlc''', '(m.status != ''nlc'' AND m.archived = false)');
    d := replace(d, 'p.status = ''active''', '(p.status = ''active'' AND p.archived = false)');
    d := replace(d, 'COALESCE(p.status::text, '''') NOT IN (''nlc'', ''rejected'', ''pending'')',
                    '(COALESCE(p.status::text, '''') NOT IN (''nlc'', ''rejected'', ''pending'') AND p.archived = false)');
    d := replace(d, 'JOIN profiles p ON p.user_id = l.claimed_by',
                    'JOIN profiles p ON p.user_id = l.claimed_by AND p.archived = false');
    d := replace(d, 'FROM profiles WHERE last_active_at >= today_start',
                    'FROM profiles WHERE archived = false AND last_active_at >= today_start');
    d := replace(d, 'WHERE status IN (''active'',''contract_signed'',''onboarded'',''info_added'')',
                    'WHERE archived = false AND status IN (''active'',''contract_signed'',''onboarded'',''info_added'')');
    d := replace(d, 'FROM profiles WHERE direct_manager IS NULL AND status != ''nlc''',
                    'FROM profiles WHERE direct_manager IS NULL AND status != ''nlc'' AND archived = false');
    d := replace(d, 'FROM profiles WHERE team_id IS NULL AND status != ''nlc''',
                    'FROM profiles WHERE team_id IS NULL AND status != ''nlc'' AND archived = false');

    EXECUTE d;
  END LOOP;
END
$mig$;
