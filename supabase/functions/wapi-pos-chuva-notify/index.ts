// @ts-nocheck
// Enfileira mensagem (PNG + caption) da inspeção Pós Chuva no wapi_outbox
// para envio ao grupo configurado, respeitando o delay global definido pelo Admin.
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
    const { caption, image_url } = body || {};

    if (!caption || typeof caption !== "string") {
      return new Response(JSON.stringify({ error: "caption obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const hasImage = typeof image_url === "string" && !!image_url.trim();

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_pos_chuva, auto_send_pos_chuva")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_pos_chuva || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || !cfg.auto_send_pos_chuva || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const row = hasImage
      ? {
          kind: "image",
          target_type: "group",
          phone: targetGroupId,
          message: null,
          caption: caption,
          image_url: image_url,
          origin: "pos_chuva",
          recipient_name: "Grupo - Pós Chuva",
        }
      : {
          kind: "text",
          target_type: "group",
          phone: targetGroupId,
          message: caption,
          origin: "pos_chuva",
          recipient_name: "Grupo - Pós Chuva",
        };

    const { error: insErr } = await admin.from("wapi_outbox").insert(row);

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-pos-chuva-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
