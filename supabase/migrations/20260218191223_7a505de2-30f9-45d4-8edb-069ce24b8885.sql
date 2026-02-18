
-- Create chat message reactions table
CREATE TABLE public.chat_reactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

-- Enable RLS
ALTER TABLE public.chat_reactions ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Authenticated users can view reactions"
  ON public.chat_reactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can add reactions"
  ON public.chat_reactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own reactions"
  ON public.chat_reactions FOR DELETE
  USING (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_chat_reactions_message_id ON public.chat_reactions(message_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_reactions;
