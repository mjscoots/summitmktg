
-- Add reply_to column to chat_messages for threading
ALTER TABLE public.chat_messages
ADD COLUMN reply_to uuid REFERENCES public.chat_messages(id) ON DELETE SET NULL;

-- Index for fast lookups of replies
CREATE INDEX idx_chat_messages_reply_to ON public.chat_messages(reply_to);
