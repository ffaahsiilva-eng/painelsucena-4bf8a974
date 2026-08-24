-- Create a table to track chat notifications to avoid duplicate/spam alerts
CREATE TABLE IF NOT EXISTS public.chat_notification_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    UNIQUE(message_id)
);

-- Enable RLS
ALTER TABLE public.chat_notification_logs ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "System can manage notification logs" ON public.chat_notification_logs
    FOR ALL USING (true) WITH CHECK (true);

-- Function to find unread messages older than 5 minutes and notify
CREATE OR REPLACE FUNCTION public.check_unread_chat_messages()
RETURNS void AS $$
DECLARE
    msg RECORD;
    receiver_profile RECORD;
    sender_profile RECORD;
BEGIN
    FOR msg IN 
        SELECT m.id, m.sender_id, m.receiver_id, m.content, m.created_at
        FROM public.chat_messages m
        LEFT JOIN public.chat_notification_logs nl ON m.id = nl.message_id
        WHERE m.read_at IS NULL 
          AND nl.id IS NULL
          AND m.created_at < (now() - interval '5 minutes')
          AND m.created_at > (now() - interval '1 hour') -- Don't notify for very old messages
    LOOP
        -- Get receiver's WhatsApp number
        SELECT full_name, whatsapp_number INTO receiver_profile 
        FROM public.profiles 
        WHERE user_id = msg.receiver_id;
        
        -- Get sender's name
        SELECT full_name INTO sender_profile 
        FROM public.profiles 
        WHERE user_id = msg.sender_id;

        IF receiver_profile.whatsapp_number IS NOT NULL AND receiver_profile.whatsapp_number <> '' THEN
            -- Insert log first to prevent race conditions
            INSERT INTO public.chat_notification_logs (message_id, receiver_id)
            VALUES (msg.id, msg.receiver_id);

            -- Invoke edge function to send WhatsApp
            -- Note: We use net.http_post if available or a trigger/pg_cron to call the function
            -- Since we are in a migration, we can't easily call fetch here, but we can setup a cron
            PERFORM net.http_post(
                url := (SELECT value FROM secrets WHERE name = 'SUPABASE_URL') || '/functions/v1/wapi-chat-notify',
                headers := jsonb_build_object(
                    'Content-Type', 'application/json',
                    'Authorization', 'Bearer ' || (SELECT value FROM secrets WHERE name = 'SUPABASE_SERVICE_ROLE_KEY')
                ),
                body := jsonb_build_object(
                    'message_id', msg.id,
                    'receiver_id', msg.receiver_id,
                    'receiver_phone', receiver_profile.whatsapp_number,
                    'receiver_name', receiver_profile.full_name,
                    'sender_name', sender_profile.full_name
                )
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Setup cron job to run every minute
-- Note: Requires pg_cron extension
SELECT cron.schedule('check-unread-chat', '* * * * *', 'SELECT public.check_unread_chat_messages()');
