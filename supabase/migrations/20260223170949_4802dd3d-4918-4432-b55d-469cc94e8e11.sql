
-- Store AI coach conversation history for persistent memory
CREATE TABLE public.ai_coach_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user', 'assistant')),
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast retrieval of recent conversations
CREATE INDEX idx_ai_coach_conversations_user_created 
  ON public.ai_coach_conversations (user_id, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_coach_conversations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own conversations
CREATE POLICY "Users can insert own ai coach messages"
  ON public.ai_coach_conversations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view own ai coach messages"
  ON public.ai_coach_conversations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own ai coach messages"
  ON public.ai_coach_conversations FOR DELETE
  USING (auth.uid() = user_id);
