-- 1) Per user per channel mute
CREATE TABLE IF NOT EXISTS public.chat_channel_mutes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  channel text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, channel)
);

GRANT SELECT, INSERT, DELETE ON public.chat_channel_mutes TO authenticated;
GRANT ALL ON public.chat_channel_mutes TO service_role;

ALTER TABLE public.chat_channel_mutes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own mutes only" ON public.chat_channel_mutes
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.set_channel_mute(_slug text, _muted boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;
  IF NOT public.can_read_channel(_slug, _uid) THEN
    RETURN jsonb_build_object('error','No access');
  END IF;

  IF _muted THEN
    INSERT INTO public.chat_channel_mutes (user_id, channel)
    VALUES (_uid, _slug)
    ON CONFLICT (user_id, channel) DO NOTHING;
  ELSE
    DELETE FROM public.chat_channel_mutes WHERE user_id = _uid AND channel = _slug;
  END IF;

  RETURN jsonb_build_object('ok', true, 'muted', _muted);
END;
$$;

REVOKE ALL ON FUNCTION public.set_channel_mute(text, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_channel_mute(text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.set_channel_mute(text, boolean) TO authenticated;

-- 2) Notification preferences with defaults on first read
CREATE OR REPLACE FUNCTION public.my_notification_prefs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid(); _row public.notification_preferences;
BEGIN
  IF _uid IS NULL THEN RETURN jsonb_build_object('error','Not authenticated'); END IF;

  SELECT * INTO _row FROM public.notification_preferences WHERE user_id = _uid;
  IF NOT FOUND THEN
    INSERT INTO public.notification_preferences (user_id)
    VALUES (_uid)
    ON CONFLICT (user_id) DO NOTHING;
    SELECT * INTO _row FROM public.notification_preferences WHERE user_id = _uid;
  END IF;

  RETURN jsonb_build_object(
    'chat_mentions', COALESCE(_row.chat_mentions, true),
    'calendar_events', COALESCE(_row.calendar_events, true),
    'announcements', COALESCE(_row.announcements, true),
    'training_quiz', COALESCE(_row.training_quiz, true),
    'leaderboard', COALESCE(_row.leaderboard, true),
    'bootcamp_reminders', COALESCE(_row.bootcamp_reminders, true),
    'streak_milestones', COALESCE(_row.streak_milestones, true),
    'new_leads', COALESCE(_row.new_leads, true),
    'lead_expiry', COALESCE(_row.lead_expiry, true)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.my_notification_prefs() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.my_notification_prefs() FROM anon;
GRANT EXECUTE ON FUNCTION public.my_notification_prefs() TO authenticated;

-- 3) Self edit scope: refuse self writes to privileged fields for everyone except owner and admin
CREATE OR REPLACE FUNCTION public.refuse_self_privileged_profile_edit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR auth.uid() <> OLD.user_id THEN
    RETURN NEW;
  END IF;
  IF public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'owner') THEN
    RETURN NEW;
  END IF;

  IF (NEW.rep_year IS DISTINCT FROM OLD.rep_year)
     OR (NEW.team_id IS DISTINCT FROM OLD.team_id)
     OR (NEW.vertical IS DISTINCT FROM OLD.vertical)
     OR (NEW.active_vertical IS DISTINCT FROM OLD.active_vertical)
     OR (NEW.runs_vertical IS DISTINCT FROM OLD.runs_vertical)
     OR (NEW.status IS DISTINCT FROM OLD.status)
     OR (NEW.status_detail IS DISTINCT FROM OLD.status_detail)
     OR (NEW.approved IS DISTINCT FROM OLD.approved)
     OR (NEW.archived IS DISTINCT FROM OLD.archived)
     OR (NEW.alumni IS DISTINCT FROM OLD.alumni)
     OR (NEW.rank_id IS DISTINCT FROM OLD.rank_id)
     OR (NEW.ladder_rung_override IS DISTINCT FROM OLD.ladder_rung_override)
     OR (NEW.manager_id IS DISTINCT FROM OLD.manager_id)
     OR (NEW.direct_manager IS DISTINCT FROM OLD.direct_manager)
     OR (NEW.recruiter_id IS DISTINCT FROM OLD.recruiter_id)
     OR (NEW.recruited_by_user_id IS DISTINCT FROM OLD.recruited_by_user_id)
     OR (NEW.region_id IS DISTINCT FROM OLD.region_id)
     OR (NEW.office_id IS DISTINCT FROM OLD.office_id)
     OR (NEW.can_recruit IS DISTINCT FROM OLD.can_recruit)
     OR (NEW.revenue_to_date IS DISTINCT FROM OLD.revenue_to_date)
     OR (NEW.cumulative_points IS DISTINCT FROM OLD.cumulative_points)
     OR (NEW.legacy_points_snapshot IS DISTINCT FROM OLD.legacy_points_snapshot)
     OR (NEW.pillar_slug IS DISTINCT FROM OLD.pillar_slug)
     OR (NEW.user_id IS DISTINCT FROM OLD.user_id)
  THEN
    RAISE EXCEPTION 'You can change your name, photo, phone and notification settings only';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS refuse_self_privileged_profile_edit_trg ON public.profiles;
CREATE TRIGGER refuse_self_privileged_profile_edit_trg
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.refuse_self_privileged_profile_edit();

-- 4) Manager event scope
CREATE OR REPLACE FUNCTION public.can_write_event(_team_id uuid, _uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _uid IS NULL THEN false
    WHEN public.has_role(_uid,'admin') OR public.has_role(_uid,'owner') THEN true
    WHEN NOT public.has_role(_uid,'manager') THEN false
    WHEN _team_id IS NULL THEN false
    ELSE EXISTS (SELECT 1 FROM public.teams t WHERE t.id = _team_id AND t.leader_id = _uid)
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _uid AND p.team_id = _team_id)
  END;
$$;

REVOKE ALL ON FUNCTION public.can_write_event(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.can_write_event(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_write_event(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Managers can create calendar events" ON public.calendar_events;
DROP POLICY IF EXISTS "Managers can update calendar events" ON public.calendar_events;

CREATE POLICY "Event writes stay in scope" ON public.calendar_events
  FOR INSERT TO authenticated
  WITH CHECK (public.can_write_event(team_id, auth.uid()));

CREATE POLICY "Event edits stay in scope" ON public.calendar_events
  FOR UPDATE TO authenticated
  USING (public.can_write_event(team_id, auth.uid()))
  WITH CHECK (public.can_write_event(team_id, auth.uid()));
