// @ts-nocheck
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
    const { desvioId, updatedBy, statusChanged, newStatus, comment } = body || {};

    if (!desvioId) {
      return new Response(JSON.stringify({ error: "desvioId obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Fetch Config
    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_desvios, auto_send_desvios")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_desvios || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || cfg.auto_send_desvios === false || !targetGroupId) {
       console.log("Notificações desabilitadas ou sem grupo configurado.");
    }

    // 2. Fetch Desvio
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

    // 3. Fetch Responsible User Profiles (multiple)
    const responsibleIds: string[] = Array.from(new Set([
      ...((Array.isArray(desvio.mentioned_user_ids) ? desvio.mentioned_user_ids : []) as string[]),
      ...(desvio.mentioned_user_id ? [desvio.mentioned_user_id as string] : []),
    ].filter(Boolean)));

    const responsiblePhones: string[] = [];
    if (responsibleIds.length > 0) {
      const { data: profs } = await admin
        .from("profiles")
        .select("user_id, whatsapp_number")
        .in("user_id", responsibleIds);
      for (const p of profs || []) {
        if (p?.whatsapp_number) {
          const cleaned = String(p.whatsapp_number).replace(/\D/g, "");
          if (cleaned && !responsiblePhones.includes(cleaned)) responsiblePhones.push(cleaned);
        }
      }
    }

    // 4. Prepare Message Content
    const attachments = Array.isArray(desvio.attachments) ? desvio.attachments : [];
    const photoUrls = Array.isArray(desvio.photo_urls) ? desvio.photo_urls : [];
    
    // Combine standard photos and attachments that are images
    const imagesToNotify = [
      ...photoUrls,
      ...attachments.filter(a => a.type?.startsWith("image/")).map(a => a.url)
    ];
    
    const otherAttachments = attachments.filter(a => !a.type?.startsWith("image/"));

    const dueDateStr = desvio.due_date
      ? new Date(desvio.due_date).toLocaleDateString("pt-BR")
      : null;
    const updatedAtStr = new Date().toLocaleString("pt-BR", { timeZone: "America/Belem" });

    const isReajuste = statusChanged && desvio.status === "Em Tratamento";
    const statusLabel = desvio.status === "Em Análise" ? "Em Análise" : desvio.status;
    
    let title = statusChanged ? `🔔 *STATUS ALTERADO: ${statusLabel}*` : `📝 *DESVIO ATUALIZADO*`;
    
    if (isReajuste) {
      title = `⚠️ *SOLICITAÇÃO DE REAJUSTE - NÃO CONFORME*`;
    }

    const lines = [
      title,
      "━━━━━━━━━━━━━━━━━━━━",
      "",
      `🔖 *Etiquetas:* ${Array.isArray(desvio.tags) ? desvio.tags.join(", ") : "—"}`,
      `🏷️ *Prioridade:* ${desvio.priority || "—"}`,
      "",
      `📋 *Problema / Assunto:*\n${desvio.description || "—"}`,
    ];

    const responsibleNamesArr: string[] = Array.isArray(desvio.mentioned_user_names) && desvio.mentioned_user_names.length > 0
      ? (desvio.mentioned_user_names as string[])
      : (desvio.responsible_name ? [desvio.responsible_name as string] : []);
    if (responsibleNamesArr.length > 0) {
      const label = responsibleNamesArr.length > 1 ? "Responsáveis" : "Responsável";
      lines.push("", `👤 *${label}:* ${responsibleNamesArr.join(", ")}`);
    }
    if (dueDateStr) {
      lines.push(`📅 *Data Limite:* ${dueDateStr}`);
    }
    if (desvio.instruction) {
      lines.push("", `🛠️ *Tratativa (Instrução):*\n${desvio.instruction}`);
    }
    if (desvio.correction) {
      lines.push("", `✅ *Correção realizada:*\n${desvio.correction}`);
    }

    if (comment && comment !== "Alteração realizada" && !comment.includes("Status alterado para")) {
      lines.push("", `💬 *Motivo/Comentário:*\n${comment}`);
    }
    
    lines.push(
      "",
      `👨‍💼 *Atualizado por:* ${updatedBy || "—"}`,
      `🕒 *Em:* ${updatedAtStr}`,
      "━━━━━━━━━━━━━━━━━━━━",
    );

    const messageText = lines.join("\n");
    const firstImage = imagesToNotify[0] || null;

    // 5. Function to queue messages
    const queueMessage = async (targetPhone, isGroup = false) => {
      if (!targetPhone) return;

      // First message: Text or Image with Caption
      const { error: insErr } = await admin.from("wapi_outbox").insert({
        kind: firstImage ? "image" : "text",
        target_type: isGroup ? "group" : "personal",
        phone: targetPhone,
        message: firstImage ? null : messageText,
        caption: firstImage ? messageText : null,
        image_url: firstImage,
        origin: "desvio_status",
      });

      if (insErr) console.error("Error queuing message:", insErr);

      // Extra Images
      const extraImages = imagesToNotify.slice(1);
      if (extraImages.length > 0) {
        const rows = extraImages.map((url) => ({
          kind: "image",
          target_type: isGroup ? "group" : "personal",
          phone: targetPhone,
          message: null,
          caption: null,
          image_url: url,
          origin: "desvio_status",
        }));
        await admin.from("wapi_outbox").insert(rows);
      }

      // Other Attachments (Documents)
      if (otherAttachments.length > 0) {
        const rows = otherAttachments.map((att) => ({
          kind: "document",
          target_type: isGroup ? "group" : "personal",
          phone: targetPhone,
          message: null,
          caption: att.name,
          image_url: att.url, // Reusing image_url for document URL
          origin: "desvio_status",
        }));
        await admin.from("wapi_outbox").insert(rows);
      }
    };

    // 6. Queue for Group and Responsible User
    const tasks = [];
    if (targetGroupId) {
      tasks.push(queueMessage(targetGroupId, true));
    }
    for (const phone of responsiblePhones) {
      tasks.push(queueMessage(phone, false));
    }

    await Promise.all(tasks);

    return new Response(JSON.stringify({ queued: true }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-desvio-status-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
