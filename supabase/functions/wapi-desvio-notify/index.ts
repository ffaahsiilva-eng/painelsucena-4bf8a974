// @ts-nocheck
// Enfileira no wapi_outbox o envio de um Desvio recém-criado para o grupo configurado.
// Envia a primeira foto como imagem com legenda detalhada; demais fotos seguem como imagens adicionais.
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
    const { desvioId } = body || {};

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

    const items = Array.isArray(desvio.items) ? desvio.items : [];
    const mentionedNames: string[] = Array.isArray(desvio.mentioned_user_names)
      ? desvio.mentioned_user_names
      : [];
    const attachments: any[] = Array.isArray(desvio.attachments) ? desvio.attachments : [];

    // Combina photo_urls + anexos do tipo imagem + fotos dos itens
    const photoSet = new Set<string>();
    (Array.isArray(desvio.photo_urls) ? desvio.photo_urls : [])
      .forEach((u: string) => u && photoSet.add(u));
    attachments
      .filter((a) => a?.url && (a?.type?.startsWith?.("image/") || /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url)))
      .forEach((a) => photoSet.add(a.url));
    items.forEach((it: any) => { if (it?.photo_url) photoSet.add(it.photo_url); });
    const photoUrls: string[] = Array.from(photoSet);

    const otherAttachments = attachments.filter(
      (a) => a?.url && !(a?.type?.startsWith?.("image/") || /\.(jpe?g|png|gif|webp|heic)$/i.test(a.url))
    );

    const dueDateStr = desvio.due_date
      ? new Date(desvio.due_date).toLocaleDateString("pt-BR")
      : null;
    const createdAtStr = desvio.created_at
      ? new Date(desvio.created_at).toLocaleString("pt-BR", { timeZone: "America/Belem" })
      : "";

    let itemDetails = "";
    if (items.length > 0) {
      itemDetails = items
        .map((item: any, i: number) => `${i + 1}. ${item.description || "Sem descrição"}`)
        .join("\n");
    }

    const lines = [
      "⚠️ *NOVO DESVIO REGISTRADO*",
      "━━━━━━━━━━━━━━━━━━━━",
      "",
      `📋 *Descrição:*\n${desvio.description || "—"}`,
    ];

    if (mentionedNames.length > 0) {
      lines.push("", `👤 *Responsável(is):* ${mentionedNames.join(", ")}`);
    }
    if (dueDateStr) {
      lines.push(`📅 *Prazo:* ${dueDateStr}`);
    }
    if (itemDetails) {
      lines.push("", `📝 *Itens:*`, itemDetails);
    }
    lines.push(
      "",
      `👨‍💼 *Registrado por:* ${desvio.created_by_name || "—"}`,
      `🕒 *Em:* ${createdAtStr}`,
      "━━━━━━━━━━━━━━━━━━━━",
    );

    const caption = lines.join("\n");
    const firstPhoto = photoUrls[0] || null;

    // Enfileira primeira mensagem (imagem com legenda OU texto puro)
    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: firstPhoto ? "image" : "text",
      target_type: "group",
      phone: targetGroupId,
      message: firstPhoto ? null : caption,
      caption: firstPhoto ? caption : null,
      image_url: firstPhoto,
      origin: "desvio",
    });
    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Enfileira fotos adicionais (sem legenda)
    const extraPhotos = photoUrls.slice(1);
    if (extraPhotos.length > 0) {
      const rows = extraPhotos.map((url) => ({
        kind: "image",
        target_type: "group",
        phone: targetGroupId,
        message: null,
        caption: null,
        image_url: url,
        origin: "desvio",
      }));
      await admin.from("wapi_outbox").insert(rows);
    }

    // Anexos não-imagem como documentos
    if (otherAttachments.length > 0) {
      const rows = otherAttachments.map((att: any) => ({
        kind: "document",
        target_type: "group",
        phone: targetGroupId,
        message: null,
        caption: att.name || null,
        image_url: att.url,
        origin: "desvio",
      }));
      await admin.from("wapi_outbox").insert(rows);
    }

    return new Response(JSON.stringify({ queued: true, photos: photoUrls.length, docs: otherAttachments.length }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-desvio-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
