
CREATE TABLE public.push_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own push subscriptions" ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX push_subscriptions_user_idx ON public.push_subscriptions(user_id);

ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS push_enabled boolean NOT NULL DEFAULT false;

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS push_sent_at timestamptz;

-- Fire the push sender for a freshly inserted notification. The edge function
-- re-reads the row with the service role and stamps push_sent_at, so a replayed
-- call sends nothing.
CREATE OR REPLACE FUNCTION public.tg_user_notification_push()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  IF NEW.digested THEN RETURN NEW; END IF;

  PERFORM net.http_post(
    url := 'https://chzvugfyjxqlcfddxyoa.supabase.co/functions/v1/send-push',
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object('notification_id', NEW.id)
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.tg_user_notification_push() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.tg_user_notification_push() FROM anon;
REVOKE EXECUTE ON FUNCTION public.tg_user_notification_push() FROM authenticated;

DROP TRIGGER IF EXISTS user_notifications_push ON public.user_notifications;
CREATE TRIGGER user_notifications_push
  AFTER INSERT ON public.user_notifications
  FOR EACH ROW EXECUTE FUNCTION public.tg_user_notification_push();

-- Save or refresh the current device's subscription.
CREATE OR REPLACE FUNCTION public.save_push_subscription(
  _endpoint text,
  _p256dh text,
  _auth text,
  _user_agent text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES (auth.uid(), _endpoint, _p256dh, _auth, left(coalesce(_user_agent, ''), 200))
  ON CONFLICT (endpoint) DO UPDATE
    SET user_id = auth.uid(),
        p256dh = excluded.p256dh,
        auth = excluded.auth,
        user_agent = excluded.user_agent,
        last_seen_at = now();

  INSERT INTO public.notification_preferences (user_id, push_enabled)
  VALUES (auth.uid(), true)
  ON CONFLICT (user_id) DO UPDATE SET push_enabled = true, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_push_subscription(text, text, text, text) TO authenticated;

-- Drop this device (or every device) and turn the push flag off.
CREATE OR REPLACE FUNCTION public.remove_push_subscription(_endpoint text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  DELETE FROM public.push_subscriptions
  WHERE user_id = auth.uid()
    AND (_endpoint IS NULL OR endpoint = _endpoint);

  INSERT INTO public.notification_preferences (user_id, push_enabled)
  VALUES (auth.uid(), false)
  ON CONFLICT (user_id) DO UPDATE SET push_enabled = false, updated_at = now();
END;
$$;

REVOKE EXECUTE ON FUNCTION public.remove_push_subscription(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.remove_push_subscription(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_push_subscription(text) TO authenticated;
