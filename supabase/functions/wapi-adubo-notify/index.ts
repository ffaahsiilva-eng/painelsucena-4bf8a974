// @ts-nocheck
// Enfileira no wapi_outbox uma mensagem quando há entrada/saída de Adubo.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { movimento_id } = body || {};
    if (!movimento_id) {
      return new Response(JSON.stringify({ error: "movimento_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: mov } = await admin
      .from("adubo_movimentos")
      .select("*")
      .eq("id", movimento_id)
      .maybeSingle();

    if (!mov) {
      return new Response(JSON.stringify({ error: "movimento não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_adubo, auto_send_adubo_alert")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = ((cfg as any)?.group_id_adubo || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || !(cfg as any).auto_send_adubo_alert || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isEntrada = mov.movement_type === "entrada";
    const header = isEntrada
      ? "🌱 *ENTRADA DE ADUBO*"
      : "📤 *RETIRADA DE ADUBO*";

    const dt = new Date(mov.created_at);
    const dataFmt = dt.toLocaleDateString("pt-BR", { timeZone: "America/Belem" });
    const horaFmt = dt.toLocaleTimeString("pt-BR", { timeZone: "America/Belem", hour: "2-digit", minute: "2-digit" });

    const lines: string[] = [];
    lines.push(header);
    lines.push("");
    lines.push(`📦 *Quantidade:* ${mov.quantity} ${mov.unit || "kg"}`);
    lines.push(`📊 *Saldo anterior:* ${mov.previous_quantity} ${mov.unit || "kg"}`);
    lines.push(`📊 *Saldo atual:* ${mov.new_quantity} ${mov.unit || "kg"}`);
    lines.push(`📅 *Data:* ${dataFmt}`);
    lines.push(`⏰ *Hora:* ${horaFmt}`);
    if (mov.environment) lines.push(`📍 *Ambiente:* ${mov.environment}`);
    if (!isEntrada && mov.withdrawer_name) lines.push(`👷 *Retirado por:* ${mov.withdrawer_name}`);
    if (mov.reason) lines.push(`💬 *Motivo:* ${mov.reason}`);
    lines.push(`👤 *Registrado por:* ${mov.registered_by_name || "-"}`);
    if (!isEntrada && mov.signature_data_url) {
      lines.push("");
      lines.push("✍️ Assinatura registrada no sistema.");
    }

    const message = lines.join("\n");
    const hasImage = !isEntrada && !!mov.signature_data_url && /^https?:\/\//.test(mov.signature_data_url || "");

    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: hasImage ? "image" : "text",
      target_type: "group",
      phone: targetGroupId,
      message: hasImage ? null : message,
      caption: hasImage ? message : null,
      image_url: hasImage ? mov.signature_data_url : null,
      origin: "adubo",
      environment: mov.environment,
      dedupe_key: `adubo:${mov.id}`,
    });

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-adubo-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
