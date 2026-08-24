import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { message_id, receiver_id, receiver_phone, receiver_name, sender_name } = await req.json();

    if (!receiver_phone) {
        return new Response(JSON.stringify({ error: "No phone number provided" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const message = `Olá *${receiver_name}*,\n\nVocê recebeu uma nova mensagem no chat do sistema de *${sender_name}* e ainda não visualizou.\n\nPor favor, acesse o sistema para responder.`;

    // Invoke wapi-send to handle the actual delivery
    const { data: sendData, error: sendError } = await admin.functions.invoke("wapi-send", {
        body: {
            message,
            recipients: [{
                user_id: receiver_id,
                name: receiver_name,
                phone: receiver_phone
            }]
        },
        headers: {
            "x-internal-token": serviceKey
        }
    });

    if (sendError) throw sendError;

    return new Response(JSON.stringify({ success: true, sendData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
