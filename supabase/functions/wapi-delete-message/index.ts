// @ts-nocheck
// Apaga (para todos) mensagens já enviadas pela W-API que estão vinculadas a um
// registro externo (ex.: requisição EPI/Material). Identifica via wapi_outbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const buildWapiUrl = (rawUrl: string, instanceId: string, pathname: string): string => {
  const url = new URL(rawUrl.trim());
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }
  url.pathname = pathname;
  url.searchParams.set("instanceId", instanceId);
  return url.toString();
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const { external_kind, external_id } = body || {};
    if (!external_kind || !external_id) {
      return new Response(JSON.stringify({ error: "external_kind e external_id são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: "wapi_disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Busca todas as mensagens enviadas vinculadas a este registro
    const { data: msgs } = await admin
      .from("wapi_outbox")
      .select("id, phone, wapi_message_id, status")
      .eq("external_kind", external_kind)
      .eq("external_id", external_id);

    const pending = (msgs || []).filter((m: any) => !m.wapi_message_id && m.status === "pending");
    const sent = (msgs || []).filter((m: any) => m.wapi_message_id);

    // Cancela as que ainda estão na fila (não foram enviadas)
    if (pending.length > 0) {
      await admin
        .from("wapi_outbox")
        .update({ status: "failed", last_error: "Cancelado: registro de origem excluído" })
        .in("id", pending.map((m: any) => m.id));
    }

    const results: any[] = [];
    for (const m of sent) {
      const endpoint = buildWapiUrl(cfg.instance_url, cfg.instance_id, "/v1/message/delete-message");
      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.instance_token}`,
          },
          body: JSON.stringify({
            phone: m.phone,
            messageId: m.wapi_message_id,
          }),
        });
        const text = await resp.text();
        results.push({ id: m.id, ok: resp.ok, status: resp.status, body: text.slice(0, 200) });
      } catch (e) {
        results.push({ id: m.id, ok: false, error: String((e as Error)?.message || e) });
      }
    }

    return new Response(JSON.stringify({
      success: true,
      cancelled_pending: pending.length,
      deleted_attempts: results.length,
      results,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    console.error("[wapi-delete-message] error:", err);
    return new Response(JSON.stringify({ error: String((err as Error)?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
