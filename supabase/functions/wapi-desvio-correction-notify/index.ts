// @ts-nocheck
// Enfileira no wapi_outbox o envio da CORREÇÃO de um Desvio para o grupo configurado.
// Envia a primeira foto de correção como imagem com legenda detalhada; demais como imagens adicionais.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { desvioId, userName } = body || {};

    if (!desvioId) {
      return new Response(JSON.stringify({ error: "desvioId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_desvios, auto_send_desvios")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_desvios || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || cfg.auto_send_desvios === false || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: desvio, error: dErr } = await admin
      .from("desvios")
      .select("*")
      .eq("id", desvioId)
      .maybeSingle();

    if (dErr || !desvio) {
      return new Response(JSON.stringify({ error: "Desvio não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const items: any[] = Array.isArray(desvio.items) ? desvio.items : [];
    const mentionedNames: string[] = Array.isArray(desvio.mentioned_user_names)
      ? desvio.mentioned_user_names
      : [];

    // Coleta todas as fotos de correção: array correction_photo_urls + per-item correction_photo_url
    const photoSet = new Set<string>();
    (Array.isArray(desvio.correction_photo_urls) ? desvio.correction_photo_urls : [])
      .forEach((u: string) => u && photoSet.add(u));
    items.forEach((it) => { if (it?.correction_photo_url) photoSet.add(it.correction_photo_url); });
    const photoUrls = Array.from(photoSet);

    const nowStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });

    let itemDetails = "";
    if (items.length > 0) {
      itemDetails = items
        .map((item: any, i: number) => {
          let line = `${i + 1}. ${item.description || "Sem descrição"}`;
          if (item.correction_observation) {
            line += `\n     ✅ _${item.correction_observation}_`;
          }
          return line;
        })
        .join("\n");
    }

    const isAnalysis = desvio.status === "Em Análise";
    const isApproved = desvio.status === "corrigido";

    const statusLabel = isAnalysis ? "EM ANÁLISE" : (isApproved ? "APROVADA" : "CORRIGIDO");
    const statusEmoji = isAnalysis ? "⏳" : "✅";

    const lines = [
      `${statusEmoji} *CORREÇÃO ${statusLabel}*`,
      "━━━━━━━━━━━━━━━━━━━━",
      "",
      `📋 *Descrição original:*\n${desvio.description || "—"}`,
      "",
    ];

    if (isApproved) {
      lines.push(
        `✅ *A correção foi aprovada por:* ${userName || "—"}`,
        "",
        `🛠️ *Resumo da Correção:*\n${desvio.correction || "—"}`,
      );
    } else {
      lines.push(
        `🛠️ *Correção realizada:*\n${desvio.correction || "—"}`,
        "",
        `👤 *Corrigido por:* ${userName || "—"}`,
        `⏳ *Aguardando análise de:* ${desvio.created_by_name || "—"}`,
      );
    }

    if (mentionedNames.length > 0) {
      lines.push("", `👤 *Responsável(is):* ${mentionedNames.join(", ")}`);
    }
    
    if (itemDetails && !isApproved) { // Only show details in analysis to avoid too long messages on approval
      lines.push("", `📝 *Itens corrigidos:*`, itemDetails);
    }

    lines.push(
      "",
      `🕒 *Em:* ${nowStr}`,
      "━━━━━━━━━━━━━━━━━━━━",
    );

    const caption = lines.join("\n");
    const firstPhoto = photoUrls[0] || null;

    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: firstPhoto ? "image" : "text",
      target_type: "group",
      phone: targetGroupId,
      message: firstPhoto ? null : caption,
      caption: firstPhoto ? caption : null,
      image_url: firstPhoto,
      origin: "desvio_correction",
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extraPhotos = photoUrls.slice(1);
    if (extraPhotos.length > 0) {
      const rows = extraPhotos.map((url) => ({
        kind: "image",
        target_type: "group",
        phone: targetGroupId,
        message: null,
        caption: null,
        image_url: url,
        origin: "desvio_correction",
      }));
      await admin.from("wapi_outbox").insert(rows);
    }

    return new Response(JSON.stringify({ queued: true, photos: photoUrls.length }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-desvio-correction-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
