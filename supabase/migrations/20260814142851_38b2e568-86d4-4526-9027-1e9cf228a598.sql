INSERT INTO public.wapi_outbox (
  kind, target_type, phone, image_url, caption, origin, dedupe_key, status, scheduled_at
) VALUES (
  'image', 
  'group', 
  '120363406691114696@g.us', 
  'https://fcaxyvptfwnwfctxkqre.supabase.co/storage/v1/object/public/order-photos/bc5ae404-e320-4c21-94cf-d13b99d9990a.jpg', 
  '📦 *NOVO PEDIDO RECEBIDO (REENVIO)*
━━━━━━━━━━━━━━━━━━━━

*Pedido:* Nº 00107
*Solicitante:* Fabrício Silva
*Data esperada:* 21/08/2026

*Itens:*
• 6 un — Rastelo Vassoura
   _Rastelo Vassoura Aço 22 Dentes Regulável Jardim Grama_

*Descrição:* Rastelo Vassoura Aço 22 Dentes Regulável Jardim Grama

━━━━━━━━━━━━━━━━━━━━
🔔 Novo pedido aberto no sistema.', 
  'order', 
  'order|00107|manual-resend-group|' || extract(epoch from now()), 
  'pending',
  now()
);