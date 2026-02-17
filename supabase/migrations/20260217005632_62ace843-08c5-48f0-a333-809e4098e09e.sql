-- Allow users to update their own chat messages
CREATE POLICY "Users can update own chat messages"
ON public.chat_messages
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own chat messages
CREATE POLICY "Users can delete own chat messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = user_id);