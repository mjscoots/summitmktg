-- Read receipts: track which users have seen which messages
CREATE TABLE public.chat_read_receipts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(message_id, user_id)
);

-- Enable RLS
ALTER TABLE public.chat_read_receipts ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view all read receipts
CREATE POLICY "Authenticated users can view read receipts"
ON public.chat_read_receipts FOR SELECT
USING (auth.uid() IS NOT NULL);

-- Users can insert their own read receipts
CREATE POLICY "Users can insert own read receipts"
ON public.chat_read_receipts FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Index for fast lookups
CREATE INDEX idx_chat_read_receipts_message_id ON public.chat_read_receipts(message_id);
CREATE INDEX idx_chat_read_receipts_user_id ON public.chat_read_receipts(user_id);

-- Enable realtime for read receipts
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_read_receipts;