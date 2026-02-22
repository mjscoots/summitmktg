-- Allow users to UPDATE their own read receipts (needed for upsert)
CREATE POLICY "Users can update own read receipts"
ON public.chat_read_receipts
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);