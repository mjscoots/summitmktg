DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = 'public.chat_prefs'::regclass AND conname = 'chat_prefs_wallpaper_check') THEN
    RAISE EXCEPTION 'Expected chat_prefs_wallpaper_check was not found';
  END IF;
END $$;

ALTER TABLE public.chat_prefs DROP CONSTRAINT chat_prefs_wallpaper_check;
ALTER TABLE public.chat_prefs DROP CONSTRAINT chat_prefs_bubble_check;

UPDATE public.chat_prefs
SET wallpaper = CASE
  WHEN wallpaper IN ('slate', 'forest', 'ice') THEN 'night'
  WHEN wallpaper = 'sand' THEN 'summit'
  ELSE wallpaper
END,
bubble = CASE
  WHEN bubble = 'graphite' THEN 'classic'
  WHEN bubble IN ('ocean', 'ember') THEN 'workspace'
  ELSE bubble
END,
room_overrides = COALESCE((
  SELECT jsonb_object_agg(
    entry.key,
    CASE
      WHEN entry.value #>> '{}' IN ('slate', 'forest', 'ice') THEN to_jsonb('night'::text)
      WHEN entry.value #>> '{}' = 'sand' THEN to_jsonb('summit'::text)
      ELSE entry.value
    END
  )
  FROM jsonb_each(COALESCE(chat_prefs.room_overrides, '{}'::jsonb)) AS entry
), '{}'::jsonb);

ALTER TABLE public.chat_prefs
  ADD CONSTRAINT chat_prefs_wallpaper_check
  CHECK (wallpaper IN ('summit', 'night', 'photo'));
ALTER TABLE public.chat_prefs
  ADD CONSTRAINT chat_prefs_bubble_check
  CHECK (bubble IN ('workspace', 'classic'));

CREATE OR REPLACE FUNCTION public.skip_duplicate_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_day_start timestamptz := date_trunc('day', COALESCE(NEW.created_at, now()) AT TIME ZONE 'UTC') AT TIME ZONE 'UTC';
  v_day_end timestamptz := v_day_start + interval '1 day';
  v_capped boolean := false;
  v_count integer := 0;
  v_digest_key text;
BEGIN
  IF NEW.source_key IS NULL THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_notifications n
    WHERE n.user_id = NEW.user_id AND n.source_key = NEW.source_key
  ) THEN
    RETURN NULL;
  END IF;

  v_capped := NEW.source_key LIKE 'inactive:%'
    OR NEW.source_key LIKE 'inactivity:%'
    OR NEW.source_key LIKE 'streak:%'
    OR NEW.source_key LIKE 'topperf:%'
    OR NEW.source_key LIKE 'appstall:%'
    OR NEW.source_key LIKE 'checklist:%'
    OR (
      NEW.source_key LIKE 'digest:%'
      AND NEW.source_key NOT LIKE 'digest:monday-manager:%'
      AND NEW.source_key NOT LIKE 'digest:sunday-weekly:%'
    );

  IF NOT v_capped THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer INTO v_count
  FROM public.user_notifications n
  WHERE n.user_id = NEW.user_id
    AND n.created_at >= v_day_start
    AND n.created_at < v_day_end
    AND (
      n.source_key LIKE 'inactive:%'
      OR n.source_key LIKE 'inactivity:%'
      OR n.source_key LIKE 'streak:%'
      OR n.source_key LIKE 'topperf:%'
      OR n.source_key LIKE 'appstall:%'
      OR n.source_key LIKE 'checklist:%'
      OR (
        n.source_key LIKE 'digest:%'
        AND n.source_key NOT LIKE 'digest:monday-manager:%'
        AND n.source_key NOT LIKE 'digest:sunday-weekly:%'
        AND n.source_key NOT LIKE 'digest:daily-fold:%'
      )
    );

  IF v_count < 3 THEN
    RETURN NEW;
  END IF;

  v_digest_key := 'digest:daily-fold:' || NEW.user_id::text || ':' || to_char(v_day_start AT TIME ZONE 'UTC', 'YYYY-MM-DD');
  IF EXISTS (
    SELECT 1 FROM public.user_notifications n
    WHERE n.user_id = NEW.user_id AND n.source_key = v_digest_key
  ) THEN
    RETURN NULL;
  END IF;

  NEW.title := 'Daily digest';
  NEW.message := 'More updates are waiting for you.';
  NEW.link := NULL;
  NEW.event_id := NULL;
  NEW.urgent := false;
  NEW.is_digest := true;
  NEW.digested := false;
  NEW.source_key := v_digest_key;
  RETURN NEW;
END;
$function$;