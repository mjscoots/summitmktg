ALTER TABLE public.app_feedback
  ADD COLUMN IF NOT EXISTS page_path text,
  ADD COLUMN IF NOT EXISTS device_info text,
  ADD COLUMN IF NOT EXISTS app_commit text,
  ADD COLUMN IF NOT EXISTS screenshot_path text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

UPDATE public.app_feedback SET status = 'open' WHERE status NOT IN ('open','in_progress','fixed','wont_fix');
UPDATE public.app_feedback SET feedback_type = 'other' WHERE feedback_type NOT IN ('bug','idea','confusing','other');

ALTER TABLE public.app_feedback ALTER COLUMN status SET DEFAULT 'open';
ALTER TABLE public.app_feedback ALTER COLUMN feedback_type SET DEFAULT 'other';

ALTER TABLE public.app_feedback DROP CONSTRAINT IF EXISTS app_feedback_type_check;
ALTER TABLE public.app_feedback ADD CONSTRAINT app_feedback_type_check
  CHECK (feedback_type IN ('bug','idea','confusing','other'));

ALTER TABLE public.app_feedback DROP CONSTRAINT IF EXISTS app_feedback_status_check;
ALTER TABLE public.app_feedback ADD CONSTRAINT app_feedback_status_check
  CHECK (status IN ('open','in_progress','fixed','wont_fix'));

GRANT SELECT, INSERT, UPDATE ON public.app_feedback TO authenticated;
GRANT ALL ON public.app_feedback TO service_role;

DROP POLICY IF EXISTS "Owner can view all feedback" ON public.app_feedback;
CREATE POLICY "Owner can view all feedback"
ON public.app_feedback FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

DROP POLICY IF EXISTS "Owner can update feedback" ON public.app_feedback;
CREATE POLICY "Owner can update feedback"
ON public.app_feedback FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'owner'::app_role));

CREATE OR REPLACE FUNCTION public.app_feedback_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wants boolean;
BEGIN
  NEW.updated_at := now();

  IF NEW.status IN ('fixed','wont_fix') THEN
    IF NEW.resolved_at IS NULL THEN NEW.resolved_at := now(); END IF;
  ELSE
    NEW.resolved_at := NULL;
  END IF;

  IF NEW.status = 'fixed' AND coalesce(OLD.status,'') <> 'fixed' THEN
    SELECT coalesce(np.announcements, true) INTO _wants
    FROM public.notification_preferences np
    WHERE np.user_id = NEW.user_id;

    IF coalesce(_wants, true) THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (
        NEW.user_id,
        'Your report was fixed',
        left(NEW.message, 60),
        '/app/more'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS app_feedback_status_change ON public.app_feedback;
CREATE TRIGGER app_feedback_status_change
BEFORE UPDATE ON public.app_feedback
FOR EACH ROW EXECUTE FUNCTION public.app_feedback_status_change();