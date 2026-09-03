// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_LABELS: Record<string, string> = {
  solicitado: "Solicitado 📨",
  em_analise: "Em Análise 🔍",
  aprovado: "Aprovado ✅",
  comprado: "Comprado 🛒",
  a_caminho: "A Caminho 🚚",
  entregue: "Entregue 📬",
  pedido_realizado: "Pedido Realizado 📦",
  cancelado: "Cancelado ❌",
  recusado: "Recusado 🚫",
};

const UNIT_LABELS: Record<string, string> = {
  unidade: "un",
  kg: "kg",
  g: "g",
  litro: "L",
  ml: "ml",
  metro: "m",
  cm: "cm",
  caixa: "cx",
  pacote: "pct",
  duzia: "dz",
};

const sanitizePhone = (raw: string): string => {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
};

async function enqueueWapi(
  targetType: "contact" | "group",
  phone: string,
  message: string,
  origin: string,
  photoUrls: string[] = [],
  dedupeKey: string | null = null,
) {
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const rows: any[] = [];
  
  if (photoUrls && photoUrls.length > 0) {
    // Clean URLs to ensure JPG and remove any trailing garbage
    const cleanUrls = photoUrls.map(u => (u || "").trim().replace(/\.webp($|\?)/, ".jpg$1"));
    
    // First photo carries the full caption
    rows.push({
      kind: "image",
      target_type: targetType,
      phone,
      image_url: cleanUrls[0],
      caption: message,
      origin,
      dedupe_key: dedupeKey ? `${dedupeKey}|photo|0` : null,
    });
    // Additional photos (if any) without caption
    for (let i = 1; i < cleanUrls.length; i++) {
      rows.push({
        kind: "image",
        target_type: targetType,
        phone,
        image_url: cleanUrls[i],
        caption: "",
        origin,
        dedupe_key: dedupeKey ? `${dedupeKey}|photo|${i}` : null,
      });
    }
  } else {
    rows.push({
      kind: "text",
      target_type: targetType,
      phone,
      message,
      origin,
      dedupe_key: dedupeKey ? `${dedupeKey}|text` : null,
    });
  }

  const { error } = await client.from("wapi_outbox").insert(rows);
  return { ok: !error, status: error ? 500 : 202, body: error ? { error: error.message } : { queued: rows.length } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const { orderId, eventType, oldStatus, newStatus, changerName } = payload || {};

    if (!orderId || !eventType) {
      return new Response(JSON.stringify({ error: "orderId e eventType são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get config
    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || !cfg.auto_send_order_alerts) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch order
    const { data: order, error: orderErr } = await admin
      .from("orders")
      .select("id, order_number, product_name, description, requester_id, requester_name, mentioned_user_id, expected_date, notes, created_at, photo_urls")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Pedido não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch items
    const { data: items } = await admin
      .from("order_items")
      .select("product_name, quantity, quantity_unit, description")
      .eq("order_id", orderId);

    const itemsList = (items || []).map((i: any) => {
      const unit = UNIT_LABELS[i.quantity_unit] || i.quantity_unit;
      let line = `• ${i.quantity} ${unit} — ${i.product_name}`;
      if (i.description) line += `\n   _${i.description}_`;
      return line;
    }).join("\n");

    const orderNum = order.order_number ? `Nº ${order.order_number}` : "";
    const expectedDate = order.expected_date
      ? new Date(order.expected_date + "T00:00:00").toLocaleDateString("pt-BR")
      : null;

    let message = "";
    const pUrls: string[] = Array.isArray((order as any).photo_urls)
      ? ((order as any).photo_urls as string[]).filter((u) => typeof u === "string" && u.length > 0)
      : [];

    if (eventType === "created") {
      const targetUserId = order.mentioned_user_id || null;
      const targetGroupId = (cfg.group_id_orders || cfg.group_id || "").trim();
      
      const msg =
        `📦 *NOVO PEDIDO RECEBIDO*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${orderNum ? `*Pedido:* ${orderNum}\n` : ""}` +
        `*Solicitante:* ${order.requester_name || "—"}\n` +
        (expectedDate ? `*Data esperada:* ${expectedDate}\n` : "") +
        `\n*Itens:*\n${itemsList || "—"}\n` +
        (order.description ? `\n*Descrição:* ${order.description}\n` : "") +
        (order.notes ? `\n*Observações:* ${order.notes}\n` : "") +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        (targetUserId ? `🔔 Você foi encaminhado(a) para analisar este pedido.` : `🔔 Novo pedido aberto no sistema.`);

      if (targetUserId) {
        const { data: tp } = await admin.from("profiles").select("whatsapp_number").eq("user_id", targetUserId).single();
        const phone = sanitizePhone(tp?.whatsapp_number || "");
        if (phone) {
          const dedupeKey = `order|${orderId}|created|contact|${Date.now()}`;
          await enqueueWapi("contact", phone, msg, "order", pUrls, dedupeKey);
        }
      } 
      
      if (targetGroupId) {
        const dedupeKey = `order|${orderId}|created|group|${Date.now()}`;
        const result = await enqueueWapi("group", targetGroupId, msg, "order", pUrls, dedupeKey);
        if (!targetUserId) {
          return new Response(JSON.stringify({ success: true, group: result }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } else if (eventType === "status_changed") {
      const oldLabel = STATUS_LABELS[oldStatus] || oldStatus || "—";
      const newLabel = STATUS_LABELS[newStatus] || newStatus || "—";
      const targetUserId = order.requester_id;

      message =
        `📦 *ATUALIZAÇÃO DE PEDIDO*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `${orderNum ? `*Pedido:* ${orderNum}\n` : ""}` +
        `*Produto:* ${order.product_name}\n\n` +
        `*Status anterior:* ${oldLabel}\n` +
        `*Status atual:* ${newLabel}\n` +
        (changerName ? `\n*Atualizado por:* ${changerName}\n` : "") +
        `\n*Itens:*\n${itemsList || "—"}\n` +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `🔔 Acompanhe seu pedido pelo sistema.`;
        
      if (targetUserId) {
        const { data: tp } = await admin.from("profiles").select("whatsapp_number").eq("user_id", targetUserId).single();
        const phone = sanitizePhone(tp?.whatsapp_number || "");
        if (phone) {
          const dedupeKey = `order|${orderId}|status|${newStatus}|${Date.now()}`;
          await enqueueWapi("contact", phone, message, "order", pUrls, dedupeKey);
        }
      }
      
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "eventType inválido" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-order-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
