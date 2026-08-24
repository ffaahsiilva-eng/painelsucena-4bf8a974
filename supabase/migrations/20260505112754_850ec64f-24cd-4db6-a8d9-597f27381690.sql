-- Update the function with search_path and outbox queue
CREATE OR REPLACE FUNCTION public.check_unread_chat_messages()
RETURNS void AS $$
DECLARE
    msg RECORD;
    receiver_profile RECORD;
    sender_profile RECORD;
    whatsapp_msg TEXT;
    phone_formatted TEXT;
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

            -- Format phone
            phone_formatted := regexp_replace(receiver_profile.whatsapp_number, '\D', '', 'g');
            IF length(phone_formatted) = 10 OR length(phone_formatted) = 11 THEN
                phone_formatted := '55' || phone_formatted;
            END IF;

            -- Build message
            whatsapp_msg := 'Olá *' || receiver_profile.full_name || '*,' || chr(10) || chr(10) || 
                            'Você recebeu uma nova mensagem no chat do sistema de *' || sender_profile.full_name || '* e ainda não visualizou.' || chr(10) || chr(10) || 
                            'Por favor, acesse o sistema para responder.' || chr(10) || chr(10) ||
                            '_Mensagem automática - Sucena_';

            -- Insert into wapi_outbox for processing
            INSERT INTO public.wapi_outbox (
                kind,
                target_type,
                phone,
                message,
                origin,
                recipient_user_id,
                recipient_name
            ) VALUES (
                'text',
                'contact',
                phone_formatted,
                whatsapp_msg,
                'chat_notification',
                msg.receiver_id,
                receiver_profile.full_name
            );
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
