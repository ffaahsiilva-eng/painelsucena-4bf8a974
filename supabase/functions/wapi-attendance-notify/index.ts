// @ts-nocheck
// Enfileira mensagem de Lista de Presença diária no wapi_outbox para envio ao grupo,
// respeitando o delay global (worker wapi-queue-worker).
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
    const { caption, area } = body || {};

    if (!caption || typeof caption !== "string") {
      return new Response(JSON.stringify({ error: "caption obrigatório" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_attendance, auto_send_attendance")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_attendance || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || !cfg.auto_send_attendance || !targetGroupId) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: targetGroupId,
      message: caption,
      caption: null,
      image_url: null,
      origin: `attendance_${area || "area"}`,
    });

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: true }), {
      status: 202,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-attendance-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
