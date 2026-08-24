// @ts-nocheck
// Envia ao grupo do WhatsApp toda alteração de quantidade de estoque com o motivo.
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
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const {
      item_id,
      movement_id,
      movement_type,
      quantity,
      previous_quantity,
      new_quantity,
      reason,
      moved_by_name,
      destination_name,
    } = body || {};

    if (!item_id || !reason) {
      return new Response(JSON.stringify({ error: "item_id e reason obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_low_stock")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroup = (cfg?.group_id_low_stock || cfg?.group_id || "").trim();
    if (!cfg?.enabled || !targetGroup) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Dedup: se já enfileirou para este movement_id, não duplicar.
    if (movement_id) {
      const { data: existing } = await admin
        .from("wapi_outbox")
        .select("id")
        .eq("origin", "inventory-change")
        .eq("external_id", movement_id)
        .limit(1)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ skipped: true, reason: "duplicate" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { data: item } = await admin
      .from("inventory_items")
      .select("name, category, unit, storage_locations(name)")
      .eq("id", item_id)
      .maybeSingle();

    if (!item) {
      return new Response(JSON.stringify({ error: "item não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const typeLabel = movement_type === "entrada" ? "➕ Entrada"
      : movement_type === "saida" ? "➖ Saída"
      : "🔄 Ajuste";

    const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const dateBr = now.toISOString().slice(0, 10).split("-").reverse().join("/");
    const timeBr = now.toISOString().slice(11, 16);
    const unit = item.unit || "";

    const lines: string[] = [];
    lines.push("📦 *ALTERAÇÃO DE ESTOQUE*");
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push("");
    lines.push(`*Item:* ${item.name}`);
    if (item.category) lines.push(`*Categoria:* ${item.category}`);
    if (item.storage_locations?.name) lines.push(`*Local:* ${item.storage_locations.name}`);
    lines.push(`*Tipo:* ${typeLabel}`);
    lines.push(`*Data:* ${dateBr}  ${timeBr}`);
    lines.push("");
    if (previous_quantity != null && new_quantity != null) {
      lines.push(`*Quantidade:* ${previous_quantity} → ${new_quantity} ${unit}`.trim());
    } else if (quantity != null) {
      lines.push(`*Quantidade:* ${quantity} ${unit}`.trim());
    }
    if (destination_name) lines.push(`*Destino:* ${destination_name}`);
    lines.push("");
    lines.push(`💬 *Motivo:* ${reason}`);
    if (moved_by_name) lines.push(`👤 *Registrado por:* ${moved_by_name}`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");

    const { error } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: targetGroup,
      message: lines.join("\n"),
      origin: "inventory-change",
      external_kind: "inventory-movement",
      external_id: movement_id || null,
    });

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-inventory-change-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
