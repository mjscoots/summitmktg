
-- 1. Add is_pinned column to chat_messages
ALTER TABLE public.chat_messages ADD COLUMN is_pinned boolean NOT NULL DEFAULT false;

-- 2. Create chat-uploads storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-uploads', 'chat-uploads', true);

-- Storage policies for chat-uploads
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'chat-uploads');

CREATE POLICY "Anyone can view chat uploads"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-uploads');

CREATE POLICY "Users can delete own chat uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can delete any chat uploads"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-uploads' AND public.has_role(auth.uid(), 'admin'));

-- 3. Create chat_polls table
CREATE TABLE public.chat_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.chat_messages(id) ON DELETE CASCADE NOT NULL,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]',
  created_by uuid NOT NULL,
  is_closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view polls"
ON public.chat_polls FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Authenticated users can create polls"
ON public.chat_polls FOR INSERT TO authenticated
WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Managers can close polls"
ON public.chat_polls FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'admin') OR auth.uid() = created_by);

-- 4. Create chat_poll_votes table
CREATE TABLE public.chat_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid REFERENCES public.chat_polls(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  option_index integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (poll_id, user_id)
);

ALTER TABLE public.chat_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view votes"
ON public.chat_poll_votes FOR SELECT TO authenticated
USING (true);

CREATE POLICY "Users can vote"
ON public.chat_poll_votes FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can change vote"
ON public.chat_poll_votes FOR UPDATE TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can remove vote"
ON public.chat_poll_votes FOR DELETE TO authenticated
USING (auth.uid() = user_id);

-- Enable realtime for polls
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_poll_votes;
