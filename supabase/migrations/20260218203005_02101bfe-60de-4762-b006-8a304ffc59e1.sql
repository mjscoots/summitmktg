
-- Add channel column to chat_messages
ALTER TABLE public.chat_messages 
ADD COLUMN channel text NOT NULL DEFAULT 'general';

-- Index for faster channel filtering
CREATE INDEX idx_chat_messages_channel ON public.chat_messages(channel);
