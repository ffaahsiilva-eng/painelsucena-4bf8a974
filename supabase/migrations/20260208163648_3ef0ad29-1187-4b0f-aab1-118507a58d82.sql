
-- Drop existing delete policy and create a new one that allows deleting sent OR received messages
DROP POLICY IF EXISTS "Users can delete their own sent messages" ON public.chat_messages;

CREATE POLICY "Users can delete their own messages"
ON public.chat_messages
FOR DELETE
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
