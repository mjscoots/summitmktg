-- C. Ask Summit memory
CREATE TABLE public.assistant_threads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'ask' CHECK (mode IN ('ask','practice')),
  title text,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_threads TO authenticated;
GRANT ALL ON public.assistant_threads TO service_role;
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;

CREATE INDEX assistant_threads_user_last_idx ON public.assistant_threads (user_id, last_at DESC);

CREATE POLICY "Own threads" ON public.assistant_threads
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Leaders and staff read threads" ON public.assistant_threads
  FOR SELECT TO authenticated
  USING (user_id <> auth.uid() AND public.can_view_person(user_id) <> 'none');

CREATE TABLE public.assistant_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;

CREATE INDEX assistant_messages_thread_idx ON public.assistant_messages (thread_id, created_at);

CREATE POLICY "Own thread messages" ON public.assistant_messages
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));

CREATE POLICY "Leaders and staff read thread messages" ON public.assistant_messages
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.assistant_threads t
    WHERE t.id = thread_id AND t.user_id <> auth.uid() AND public.can_view_person(t.user_id) <> 'none'
  ));

-- D. AI-built rep profile
CREATE TABLE public.rep_ai_profiles (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  summary text,
  strengths jsonb NOT NULL DEFAULT '[]'::jsonb,
  concerns jsonb NOT NULL DEFAULT '[]'::jsonb,
  topics jsonb NOT NULL DEFAULT '[]'::jsonb,
  goals text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_built_at timestamptz,
  source_count int NOT NULL DEFAULT 0,
  tokens_used int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.rep_ai_profiles TO authenticated;
GRANT ALL ON public.rep_ai_profiles TO service_role;
ALTER TABLE public.rep_ai_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own AI profile" ON public.rep_ai_profiles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Leaders and staff read AI profile" ON public.rep_ai_profiles
  FOR SELECT TO authenticated
  USING (user_id <> auth.uid() AND public.can_view_person(user_id) <> 'none');

CREATE TRIGGER rep_ai_profiles_updated_at
  BEFORE UPDATE ON public.rep_ai_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Threads for a person, for the rep themself or a permitted viewer.
CREATE OR REPLACE FUNCTION public.get_person_threads(_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rows jsonb;
BEGIN
  IF _user_id <> auth.uid() AND public.can_view_person(_user_id) = 'none' THEN
    RETURN jsonb_build_object('error', 'No access');
  END IF;

  SELECT coalesce(jsonb_agg(x ORDER BY x->>'last_at' DESC), '[]'::jsonb) INTO _rows
  FROM (
    SELECT jsonb_build_object(
      'id', t.id,
      'mode', t.mode,
      'title', t.title,
      'created_at', t.created_at,
      'last_at', t.last_at,
      'message_count', (SELECT count(*) FROM public.assistant_messages m WHERE m.thread_id = t.id)
    ) AS x
    FROM public.assistant_threads t
    WHERE t.user_id = _user_id
    ORDER BY t.last_at DESC
    LIMIT 50
  ) s;

  RETURN jsonb_build_object('threads', _rows);
END;
$$;

REVOKE ALL ON FUNCTION public.get_person_threads(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_person_threads(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_thread_messages(_thread_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _owner uuid;
  _rows jsonb;
BEGIN
  SELECT user_id INTO _owner FROM public.assistant_threads WHERE id = _thread_id;
  IF _owner IS NULL THEN
    RETURN jsonb_build_object('error', 'Not found');
  END IF;
  IF _owner <> auth.uid() AND public.can_view_person(_owner) = 'none' THEN
    RETURN jsonb_build_object('error', 'No access');
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('role', m.role, 'content', m.content, 'created_at', m.created_at) ORDER BY m.created_at), '[]'::jsonb)
  INTO _rows
  FROM public.assistant_messages m
  WHERE m.thread_id = _thread_id;

  RETURN jsonb_build_object('messages', _rows);
END;
$$;

REVOKE ALL ON FUNCTION public.get_thread_messages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_thread_messages(uuid) TO authenticated, service_role;