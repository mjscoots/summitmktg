CREATE TABLE public.resign_intents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','dismissed')),
  decided_by uuid NULL,
  decided_at timestamptz NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX resign_intents_one_pending
  ON public.resign_intents (user_id)
  WHERE status = 'pending';

GRANT SELECT, INSERT, UPDATE ON public.resign_intents TO authenticated;
GRANT ALL ON public.resign_intents TO service_role;

ALTER TABLE public.resign_intents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own intent insert" ON public.resign_intents
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "own intent read" ON public.resign_intents
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "staff read intents" ON public.resign_intents
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "staff update intents" ON public.resign_intents
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Raise a hand for 2027. Idempotent: an existing pending row is returned as is.
CREATE OR REPLACE FUNCTION public.submit_resign_intent()
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _name text;
  _id uuid;
  _staff uuid;
BEGIN
  IF _me IS NULL THEN
    RAISE EXCEPTION 'not signed in';
  END IF;

  SELECT id INTO _id
  FROM public.resign_intents
  WHERE user_id = _me AND status = 'pending'
  LIMIT 1;

  IF _id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'pending', 'created', false);
  END IF;

  INSERT INTO public.resign_intents (user_id) VALUES (_me) RETURNING id INTO _id;

  SELECT COALESCE(full_name, 'A rep') INTO _name FROM public.profiles WHERE user_id = _me;

  FOR _staff IN
    SELECT DISTINCT r.user_id FROM public.user_roles r
    WHERE r.role IN ('owner'::app_role, 'admin'::app_role)
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.notification_preferences np
      WHERE np.user_id = _staff AND np.announcements = false
    ) THEN
      CONTINUE;
    END IF;
    INSERT INTO public.user_notifications (user_id, title, message, link, deliver_after)
    VALUES (
      _staff,
      'Re-sign intent',
      _name || ' is in for 2027',
      '/admin/requests',
      public.notification_deliver_at(false)
    );
  END LOOP;

  RETURN jsonb_build_object('status', 'pending', 'created', true);
END;
$$;

-- My own intent state, nothing else.
CREATE OR REPLACE FUNCTION public.my_resign_intent()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _status text;
BEGIN
  IF _me IS NULL THEN RETURN jsonb_build_object(); END IF;
  SELECT status INTO _status
  FROM public.resign_intents
  WHERE user_id = _me
  ORDER BY created_at DESC
  LIMIT 1;
  RETURN jsonb_build_object('status', _status);
END;
$$;

-- Owner and admin only: the pending queue.
CREATE OR REPLACE FUNCTION public.list_resign_intents()
RETURNS TABLE (id uuid, user_id uuid, full_name text, created_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT i.id, i.user_id, COALESCE(p.full_name, 'Unnamed rep'), i.created_at
  FROM public.resign_intents i
  LEFT JOIN public.profiles p ON p.user_id = i.user_id
  WHERE i.status = 'pending'
  ORDER BY i.created_at ASC;
END;
$$;

-- Owner and admin only: confirm flips the roster row, dismiss touches nothing else.
CREATE OR REPLACE FUNCTION public.decide_resign_intent(_intent_id uuid, _confirm boolean)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _target uuid;
  _pid uuid;
  _flipped int := 0;
BEGIN
  IF NOT public.has_role(_me, 'admin') THEN
    RAISE EXCEPTION 'not allowed';
  END IF;

  SELECT user_id INTO _target
  FROM public.resign_intents
  WHERE id = _intent_id AND status = 'pending';

  IF _target IS NULL THEN
    RETURN jsonb_build_object('ok', false);
  END IF;

  UPDATE public.resign_intents
  SET status = CASE WHEN _confirm THEN 'confirmed' ELSE 'dismissed' END,
      decided_by = _me,
      decided_at = now()
  WHERE id = _intent_id;

  IF _confirm THEN
    SELECT id INTO _pid FROM public.profiles WHERE user_id = _target;
    IF _pid IS NOT NULL THEN
      UPDATE public.people_leads
      SET signed_2027 = true, updated_at = now()
      WHERE profile_id = _pid;
      _flipped := 1;
    END IF;

    INSERT INTO public.user_notifications (user_id, title, message, link, deliver_after)
    VALUES (_target, 'You are locked in for 2027', 'Your seat for next season is confirmed', '/app', public.notification_deliver_at(false));
  END IF;

  RETURN jsonb_build_object('ok', true, 'confirmed', _confirm, 'roster_updated', _flipped);
END;
$$;

-- Fires the locked in moment exactly once per confirmation.
CREATE OR REPLACE FUNCTION public.claim_resign_celebration()
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _me uuid := auth.uid();
  _confirmed timestamptz;
BEGIN
  IF _me IS NULL THEN RETURN false; END IF;

  SELECT decided_at INTO _confirmed
  FROM public.resign_intents
  WHERE user_id = _me AND status = 'confirmed'
  ORDER BY decided_at DESC NULLS LAST
  LIMIT 1;

  IF _confirmed IS NULL THEN RETURN false; END IF;

  IF EXISTS (
    SELECT 1 FROM public.celebration_log
    WHERE user_id = _me
      AND celebration_type = 'resign_2027'
      AND posted_at >= _confirmed
  ) THEN
    RETURN false;
  END IF;

  INSERT INTO public.celebration_log (user_id, celebration_type)
  VALUES (_me, 'resign_2027');

  RETURN true;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.submit_resign_intent() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.my_resign_intent() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.list_resign_intents() FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.decide_resign_intent(uuid, boolean) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.claim_resign_celebration() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.submit_resign_intent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.my_resign_intent() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_resign_intents() TO authenticated;
GRANT EXECUTE ON FUNCTION public.decide_resign_intent(uuid, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_resign_celebration() TO authenticated;
