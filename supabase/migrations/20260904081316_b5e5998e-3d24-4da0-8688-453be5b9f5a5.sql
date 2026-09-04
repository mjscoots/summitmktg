CREATE OR REPLACE FUNCTION public.skip_duplicate_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.skip_duplicate_notification() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.skip_duplicate_notification() FROM anon;
REVOKE ALL ON FUNCTION public.skip_duplicate_notification() FROM authenticated;

DROP TRIGGER IF EXISTS trg_skip_duplicate_notification ON public.user_notifications;
CREATE TRIGGER trg_skip_duplicate_notification
BEFORE INSERT ON public.user_notifications
FOR EACH ROW
EXECUTE FUNCTION public.skip_duplicate_notification();