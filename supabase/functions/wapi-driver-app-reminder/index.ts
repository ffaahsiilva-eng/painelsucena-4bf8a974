// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || !cfg.auto_send_driver_app_reminder) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetGroupId = (cfg.group_id_driver_app_reminder || cfg.group_id_driver_status || cfg.group_id || "").trim();
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config-or-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const now = new Date();
    const paraTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dayOfWeek = paraTime.getDay(); // 1=Monday ... 5=Friday, 6=Saturday, 0=Sunday
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return new Response(JSON.stringify({ skipped: true, reason: "weekend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const dateBR = paraTime.toISOString().slice(0, 10).split("-").reverse().join("/");

    const message =
      `🚜 *LEMBRETE DIÁRIO — MOTORISTAS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Bom dia, equipe! ☀️\n\n` +
      `Lembrete para *todos os motoristas e operadores* utilizarem o *aplicativo* hoje:\n\n` +
      `✅ Preencher o *KM inicial e final*\n` +
      `✅ Preencher o *Horímetro inicial e final*\n` +
      `✅ Informar o *nome do ajudante* do dia\n` +
      `✅ Atualizar o *status do equipamento* (Operando, Aguardando, Abastecendo, Fim de Turno, etc.)\n\n` +
      `📲 Acesse o app *Sucena* e mantenha os dados sempre atualizados.\n\n` +
      `_Data: ${dateBR}_\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const { error } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: targetGroupId,
      message,
      origin: "driver-app-reminder",
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, queued: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-driver-app-reminder] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
