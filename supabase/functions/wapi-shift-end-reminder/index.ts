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

    // Horário Pará (UTC-3). Não enviar sábado (6) e domingo (0).
    const now = new Date();
    const paraTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dow = paraTime.getUTCDay();
    if (dow === 0 || dow === 6) {
      return new Response(JSON.stringify({ skipped: true, reason: "weekend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetGroupId = (cfg.group_id_driver_status || cfg.group_id || "").trim();
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config-or-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lista equipamentos com motorista atribuído cujo status atual NÃO é fim_turno/end_of_shift.
    const { data: equipments, error: eqErr } = await admin
      .from("equipment")
      .select("id, name, plate, driver, stop_reason")
      .not("driver", "is", null)
      .neq("driver", "");

    if (eqErr) {
      return new Response(JSON.stringify({ error: eqErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pendentes = (equipments || []).filter((e: any) => {
      const status = (e.stop_reason || "").toString();
      return status !== "end_of_shift" && status !== "fim_turno";
    });

    if (pendentes.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no-pending" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dateBR = paraTime.toISOString().slice(0, 10).split("-").reverse().join("/");

    let message =
      `⏰ *LEMBRETE — FIM DE TURNO*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `São 16:20h e os equipamentos abaixo *ainda não registraram o Fim de Turno* hoje:\n\n`;

    for (const eq of pendentes) {
      message += `🚜 *${eq.name}* (${eq.plate})\n   👤 ${eq.driver}\n\n`;
    }

    message +=
      `📲 Motoristas, por favor acessem o app *Sucena* e registrem o *Fim de Turno* preenchendo Horímetro, KM e Combustível final.\n\n` +
      `_Data: ${dateBR}_\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const { error } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: targetGroupId,
      message,
      origin: "shift-end-reminder",
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, count: pendentes.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-shift-end-reminder] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
