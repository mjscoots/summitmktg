-- ── Weekly digest ─────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS chat_messages_weekly_digest_once
  ON public.chat_messages (date_trunc('week', timezone('America/New_York', created_at)))
  WHERE kind = 'system' AND meta->>'source' = 'weekly_digest';

CREATE OR REPLACE FUNCTION public.post_weekly_digest()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _week timestamp;
  _sender uuid;
  _signed int := 0;
  _new_ct int := 0;
  _names text;
  _events text;
  _lines text[] := '{}';
  _content text;
BEGIN
  _week := date_trunc('week', timezone('America/New_York', now()));

  IF EXISTS (
    SELECT 1 FROM public.chat_messages
    WHERE kind = 'system'
      AND meta->>'source' = 'weekly_digest'
      AND date_trunc('week', timezone('America/New_York', created_at)) = _week
  ) THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'already posted this week');
  END IF;

  SELECT user_id INTO _sender
  FROM public.user_roles WHERE role = 'owner' ORDER BY created_at LIMIT 1;
  IF _sender IS NULL THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'no owner');
  END IF;

  SELECT count(*) INTO _signed FROM public.people_leads WHERE signed_2027;

  SELECT count(*),
         string_agg(nullif(split_part(coalesce(full_name, ''), ' ', 1), ''), ', ' ORDER BY created_at)
    INTO _new_ct, _names
  FROM public.profiles
  WHERE created_at > now() - interval '7 days'
    AND coalesce(archived, false) = false;

  SELECT string_agg(title || ' on ' || trim(to_char(event_date, 'FMDay')), ', ' ORDER BY event_date)
    INTO _events
  FROM public.calendar_events
  WHERE scope = 'everyone'
    AND coalesce(is_cancelled, false) = false
    AND event_date >= now()
    AND event_date < now() + interval '7 days';

  IF _signed > 0 THEN
    _lines := _lines || format(
      '%s %s signed for 2027 so far.',
      _signed, CASE WHEN _signed = 1 THEN 'person is' ELSE 'people are' END);
  END IF;

  IF _new_ct > 0 THEN
    IF _new_ct <= 5 AND _names IS NOT NULL THEN
      _lines := _lines || format('%s %s joined the app this week: %s.',
        _new_ct, CASE WHEN _new_ct = 1 THEN 'person' ELSE 'people' END, _names);
    ELSE
      _lines := _lines || format('%s people joined the app this week.', _new_ct);
    END IF;
  END IF;

  IF _events IS NOT NULL THEN
    _lines := _lines || format('Coming up in the next seven days: %s.', _events);
  END IF;

  IF array_length(_lines, 1) IS NULL THEN
    RETURN jsonb_build_object('posted', false, 'reason', 'nothing to say');
  END IF;

  _content := array_to_string(_lines, ' ');

  INSERT INTO public.chat_messages (user_id, content, is_ai, channel, kind, meta)
  VALUES (_sender, _content, true, 'general', 'system',
          jsonb_build_object('source', 'weekly_digest', 'label', 'Summit HQ'));

  RETURN jsonb_build_object('posted', true, 'content', _content);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.post_weekly_digest() FROM PUBLIC, anon, authenticated;

-- ── Nightly backup ────────────────────────────────────────────────────
CREATE UNIQUE INDEX IF NOT EXISTS backup_snapshots_one_per_night
  ON public.backup_snapshots ((timezone('America/New_York', created_at)::date))
  WHERE trigger_source = 'cron';

CREATE OR REPLACE FUNCTION public.run_nightly_backup()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token text;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.backup_snapshots
    WHERE trigger_source = 'cron'
      AND timezone('America/New_York', created_at)::date
          = timezone('America/New_York', now())::date
  ) THEN
    RETURN jsonb_build_object('requested', false, 'reason', 'already ran tonight');
  END IF;

  INSERT INTO public.backup_job_tokens DEFAULT VALUES RETURNING token INTO _token;

  PERFORM net.http_post(
    url := 'https://chzvugfyjxqlcfddxyoa.supabase.co/functions/v1/db-backup',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('job_token', _token),
    timeout_milliseconds := 120000
  );

  RETURN jsonb_build_object('requested', true);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.run_nightly_backup() FROM PUBLIC, anon, authenticated;

-- ── Schedules ─────────────────────────────────────────────────────────
SELECT cron.unschedule('summit-weekly-backup');
SELECT cron.schedule('summit-nightly-backup', '0 7 * * *', $$select public.run_nightly_backup();$$);
SELECT cron.schedule('summit-weekly-digest', '0 22 * * 0', $$select public.post_weekly_digest();$$);
