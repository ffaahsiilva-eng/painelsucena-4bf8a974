// @ts-nocheck
// Enfileira no wapi_outbox um alerta de estoque baixo / zerado para o grupo configurado.
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
    const { item_id, movement_type, moved_by_name, reason, destination_name } = body || {};

    if (!item_id) {
      return new Response(JSON.stringify({ error: "item_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_low_stock, auto_send_low_stock_alert")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_low_stock || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || !cfg.auto_send_low_stock_alert || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: item } = await admin
      .from("inventory_items")
      .select("name, category, quantity, min_quantity, unit, ca_number, ca_expiry, notes, photo_urls, storage_locations(name)")
      .eq("id", item_id)
      .maybeSingle();

    if (!item) {
      return new Response(JSON.stringify({ error: "item não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const qty = Number(item.quantity || 0);
    const min = Number(item.min_quantity || 0);
    const isZero = qty <= 0;
    const isLow = qty > 0 && qty <= min;

    if (!isZero && !isLow) {
      return new Response(JSON.stringify({ skipped: true, reason: "above-min" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const header = isZero
      ? "🚨 *ESTOQUE ZERADO*"
      : "⚠️ *ESTOQUE ABAIXO DO MÍNIMO*";

    const lines: string[] = [];
    lines.push(header);
    lines.push("");
    lines.push(`📦 *Item:* ${item.name}`);
    lines.push(`🏷️ *Categoria:* ${item.category || "-"}`);
    lines.push(`📊 *Quantidade atual:* ${qty} ${item.unit || ""}`.trim());
    lines.push(`🎯 *Mínimo definido:* ${min} ${item.unit || ""}`.trim());
    if (item.storage_locations?.name) lines.push(`📍 *Local:* ${item.storage_locations.name}`);
    if (item.ca_number) lines.push(`🔖 *CA:* ${item.ca_number}`);
    if (item.ca_expiry) lines.push(`📅 *Validade CA:* ${new Date(item.ca_expiry).toLocaleDateString("pt-BR")}`);
    if (item.notes) lines.push(`📝 *Observações:* ${item.notes}`);
    lines.push("");
    if (movement_type) lines.push(`🔄 *Última movimentação:* ${movement_type}`);
    if (destination_name) lines.push(`➡️ *Destino:* ${destination_name}`);
    if (reason) lines.push(`💬 *Motivo:* ${reason}`);
    if (moved_by_name) lines.push(`👤 *Registrado por:* ${moved_by_name}`);
    lines.push("");
    lines.push(isZero
      ? "❗ Reposição imediata necessária."
      : "📥 Recomenda-se providenciar reposição.");

    const message = lines.join("\n");
    const firstPhoto = Array.isArray(item.photo_urls) && item.photo_urls.length > 0 ? item.photo_urls[0] : null;
    const hasImage = !!firstPhoto;

    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: hasImage ? "image" : "text",
      target_type: "group",
      phone: targetGroupId,
      message: hasImage ? null : message,
      caption: hasImage ? message : null,
      image_url: hasImage ? firstPhoto : null,
      origin: "low_stock",
    });

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: true, level: isZero ? "zero" : "low" }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-low-stock-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
