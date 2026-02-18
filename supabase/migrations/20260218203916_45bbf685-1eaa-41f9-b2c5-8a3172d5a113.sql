CREATE POLICY "Managers can delete chat messages"
ON public.chat_messages
FOR DELETE
USING (has_role(auth.uid(), 'manager'::app_role));