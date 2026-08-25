-- 1. New notification preference toggles
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS new_leads boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS lead_expiry boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS announcements boolean NOT NULL DEFAULT true;

-- 2. Server-side chat read state
CREATE TABLE IF NOT EXISTS public.chat_read_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.chat_read_state TO authenticated;
GRANT ALL ON public.chat_read_state TO service_role;

ALTER TABLE public.chat_read_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own chat read state" ON public.chat_read_state;
CREATE POLICY "Users manage own chat read state"
  ON public.chat_read_state FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP TRIGGER IF EXISTS update_chat_read_state_updated_at ON public.chat_read_state;
CREATE TRIGGER update_chat_read_state_updated_at
  BEFORE UPDATE ON public.chat_read_state
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Non-destructive admin queue dismissals
CREATE TABLE IF NOT EXISTS public.admin_queue_dismissals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_type text NOT NULL,
  item_key text NOT NULL,
  dismissed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dismissed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (item_type, item_key)
);

GRANT SELECT, INSERT, DELETE ON public.admin_queue_dismissals TO authenticated;
GRANT ALL ON public.admin_queue_dismissals TO service_role;

ALTER TABLE public.admin_queue_dismissals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read queue dismissals" ON public.admin_queue_dismissals;
CREATE POLICY "Admins read queue dismissals"
  ON public.admin_queue_dismissals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Admins create queue dismissals" ON public.admin_queue_dismissals;
CREATE POLICY "Admins create queue dismissals"
  ON public.admin_queue_dismissals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP POLICY IF EXISTS "Admins remove queue dismissals" ON public.admin_queue_dismissals;
CREATE POLICY "Admins remove queue dismissals"
  ON public.admin_queue_dismissals FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'owner'));

DROP TRIGGER IF EXISTS update_admin_queue_dismissals_updated_at ON public.admin_queue_dismissals;
CREATE TRIGGER update_admin_queue_dismissals_updated_at
  BEFORE UPDATE ON public.admin_queue_dismissals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Notify all reps when a new lead hits the board
CREATE OR REPLACE FUNCTION public.notify_new_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(NEW.status, 'New') <> 'New' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, title, message, link)
  SELECT p.user_id,
         'New lead on the board',
         COALESCE(NEW.first_name, 'A new lead')
           || COALESCE(' from ' || NEW.city, '')
           || ' is unclaimed.',
         '/app/recruits'
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
  WHERE p.user_id IS NOT NULL
    AND COALESCE(p.status::text, '') NOT IN ('nlc', 'rejected', 'pending')
    AND COALESCE(np.new_leads, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_new_lead ON public.recruiting_leads;
CREATE TRIGGER trg_notify_new_lead
  AFTER INSERT ON public.recruiting_leads
  FOR EACH ROW EXECUTE FUNCTION public.notify_new_lead();

-- 5. Notify everyone when an announcement is published
CREATE OR REPLACE FUNCTION public.notify_announcement_published()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status = 'published' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, title, message, link)
  SELECT p.user_id,
         'New announcement',
         NEW.title,
         '/app'
  FROM public.profiles p
  LEFT JOIN public.notification_preferences np ON np.user_id = p.user_id
  WHERE p.user_id IS NOT NULL
    AND COALESCE(p.status::text, '') NOT IN ('nlc', 'rejected', 'pending')
    AND COALESCE(np.announcements, true);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_announcement_published ON public.announcement_posts;
CREATE TRIGGER trg_notify_announcement_published
  AFTER INSERT OR UPDATE OF status ON public.announcement_posts
  FOR EACH ROW EXECUTE FUNCTION public.notify_announcement_published();

-- 6. Notify managers/admins when an application is approved
CREATE OR REPLACE FUNCTION public.notify_application_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status <> 'approved' OR COALESCE(OLD.status, '') = 'approved' THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_notifications (user_id, title, message, link)
  SELECT DISTINCT ur.user_id,
         'Application approved',
         COALESCE(NEW.full_name, 'An applicant') || ' was approved.',
         '/admin/team'
  FROM public.user_roles ur
  WHERE ur.role IN ('manager', 'admin', 'owner');

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_application_approved ON public.applications;
CREATE TRIGGER trg_notify_application_approved
  AFTER UPDATE OF status ON public.applications
  FOR EACH ROW EXECUTE FUNCTION public.notify_application_approved();

-- 7. Warn claimers when their lead is within 8 hours of auto-release
CREATE OR REPLACE FUNCTION public.notify_lead_expiry_warnings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
  lnk text;
BEGIN
  FOR r IN
    SELECT rl.id, rl.first_name, rl.claimed_by,
           COALESCE(rl.last_activity_at, rl.claimed_at) AS ts
    FROM public.recruiting_leads rl
    LEFT JOIN public.notification_preferences np ON np.user_id = rl.claimed_by
    WHERE rl.status IN ('Claimed', 'Contacted')
      AND rl.claimed_by IS NOT NULL
      AND COALESCE(rl.ref_code, '') <> 'pipeline-import'
      AND COALESCE(np.lead_expiry, true)
      AND COALESCE(rl.last_activity_at, rl.claimed_at) < now() - interval '40 hours'
      AND COALESCE(rl.last_activity_at, rl.claimed_at) >= now() - interval '48 hours'
  LOOP
    lnk := '/app/recruits?lead=' || r.id::text;

    IF NOT EXISTS (
      SELECT 1 FROM public.user_notifications un
      WHERE un.user_id = r.claimed_by
        AND un.link = lnk
        AND un.title = 'Lead expiring soon'
    ) THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Lead expiring soon',
              COALESCE(r.first_name, 'Your lead') || ' auto-releases in under 8 hours — log activity to keep it.',
              lnk);
      n := n + 1;
    END IF;
  END LOOP;

  RETURN n;
END;
$$;

-- 8. Run the expiry warnings whenever stale leads are swept
CREATE OR REPLACE FUNCTION public.release_stale_leads()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  PERFORM public.notify_lead_expiry_warnings();

  FOR r IN
    SELECT id, first_name, claimed_by
    FROM public.recruiting_leads
    WHERE status IN ('Claimed','Contacted')
      AND COALESCE(ref_code, '') <> 'pipeline-import'
      AND COALESCE(last_activity_at, claimed_at) < now() - interval '48 hours'
    FOR UPDATE
  LOOP
    UPDATE public.recruiting_leads
    SET status = 'New', claimed_by = NULL, claimed_at = NULL, last_activity_at = NULL
    WHERE id = r.id;

    IF r.claimed_by IS NOT NULL THEN
      INSERT INTO public.user_notifications (user_id, title, message, link)
      VALUES (r.claimed_by, 'Lead released',
              'You lost ' || r.first_name || ' — no activity in 48 hours.',
              '/app/recruits');
    END IF;

    n := n + 1;
  END LOOP;

  RETURN n;
END;
$$;
