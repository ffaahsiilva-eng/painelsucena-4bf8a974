import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface Recipient {
  user_id?: string | null;
  name?: string | null;
  phone: string;
}

interface Body {
  message: string;
  recipients: Recipient[];
  group_id?: string | null;
  image_url?: string | null;
  caption?: string | null;
}

const sanitizePhone = (raw: string): string => {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
};

const buildWapiEndpoint = (rawUrl: string, instanceId: string, isGroup: boolean): string => {
  const url = new URL(rawUrl.trim());
  const normalizedPath = url.pathname.replace(/\/+$/, "");

  // W-API: send-text para contato; send-message-group / send-text-group para grupos
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }

  const targetPath = isGroup ? "/v1/message/send-text" : "/v1/message/send-text";
  if (!normalizedPath.endsWith("/send-text")) {
    url.pathname = targetPath;
  }

  url.searchParams.set("instanceId", instanceId);
  return url.toString();
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

const containsGroupId = (value: unknown, groupId: string): boolean => {
  if (typeof value === "string") return value.trim() === groupId;
  if (Array.isArray(value)) return value.some((item) => containsGroupId(item, groupId));
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).some((item) => containsGroupId(item, groupId));
  return false;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const admin = createClient(supabaseUrl, serviceKey);

    // Bypass para chamadas internas server-to-server (ex: wapi-reminders-notify, cron)
    const authHeader = req.headers.get("Authorization") || "";
    const internalToken = req.headers.get("x-internal-token") || "";
    const isInternalCall = internalToken && internalToken === serviceKey;
    let userId: string | null = null;

    if (!isInternalCall) {
      if (!authHeader.startsWith("Bearer ")) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const userClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const token = authHeader.replace("Bearer ", "");
      const { data: userData, error: userErr } = await userClient.auth.getUser(token);
      if (userErr || !userData?.user?.id) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = userData.user.id;

      const { data: isAdmin } = await admin.rpc("is_admin", { _user_id: userId });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const body: Body = await req.json();
    const isGroupSend = !!body?.group_id && body.group_id.trim().length > 0;

    if (!body?.message) {
      return new Response(JSON.stringify({ error: "Mensagem é obrigatória" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!isGroupSend && (!Array.isArray(body.recipients) || body.recipients.length === 0)) {
      return new Response(JSON.stringify({ error: "Destinatários ou ID do grupo são obrigatórios" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (body.message.length > 4000) {
      return new Response(JSON.stringify({ error: "Mensagem muito longa (máx 4000)" }), {
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
      return new Response(JSON.stringify({ error: "W-API não configurada ou desabilitada" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const endpoint = buildWapiEndpoint(cfg.instance_url, cfg.instance_id, isGroupSend);
    const delayMs = Math.max(0, Number(cfg.delay_seconds ?? 5)) * 1000;
    const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

    const results: Array<{ phone: string; ok: boolean; error?: string }> = [];

    if (isGroupSend) {
      const groupId = (body.group_id || "").trim();
      try {
        const groupsUrl = buildWapiUrl(cfg.instance_url, cfg.instance_id, "/v1/group/get-all-groups");
        const groupsResp = await fetch(groupsUrl, {
          method: "GET",
          headers: { "Authorization": `Bearer ${cfg.instance_token}` },
        });
        const groupsText = await groupsResp.text();
        let groupsJson: unknown = null;
        try { groupsJson = JSON.parse(groupsText); } catch { groupsJson = { raw: groupsText }; }

        if (!groupsResp.ok) {
          throw new Error(`Falha ao validar grupo na W-API (HTTP ${groupsResp.status}): ${groupsText.slice(0, 200)}`);
        }
        if (!containsGroupId(groupsJson, groupId)) {
          throw new Error(`Grupo ${groupId} não encontrado na instância ${cfg.instance_id}. Use o ID retornado por /v1/group/get-all-groups.`);
        }

        const delayMessage = Math.max(1, Math.min(15, Number(cfg.delay_seconds ?? 5) || 5));
        const hasImage = !!body.image_url && body.image_url.trim().length > 0;
        const sendEndpoint = hasImage
          ? buildWapiUrl(cfg.instance_url, cfg.instance_id, "/v1/message/send-image")
          : endpoint;
        const sendPayload: Record<string, unknown> = hasImage
          ? { phone: groupId, image: body.image_url, caption: body.caption ?? body.message, delayMessage }
          : { phone: groupId, message: body.message, delayMessage };

        const resp = await fetch(sendEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.instance_token}`,
          },
          body: JSON.stringify(sendPayload),
        });
        const respText = await resp.text();
        let respJson: unknown = null;
        try { respJson = JSON.parse(respText); } catch { respJson = { raw: respText }; }

        const ok = resp.ok;
        await admin.from("wapi_message_logs").insert({
          sent_by: userId,
          recipient_user_id: null,
          recipient_name: `Grupo ${groupId}`,
          recipient_phone: groupId,
          message: body.message,
          status: ok ? "sent" : "failed",
          error_message: ok ? null : `HTTP ${resp.status}: ${respText.slice(0, 200)}`,
          response: respJson as never,
        });
        results.push({ phone: groupId, ok, error: ok ? undefined : `HTTP ${resp.status}` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        await admin.from("wapi_message_logs").insert({
          sent_by: userId,
          recipient_user_id: null,
          recipient_name: `Grupo ${groupId}`,
          recipient_phone: groupId,
          message: body.message,
          status: "failed",
          error_message: msg,
        });
        results.push({ phone: groupId, ok: false, error: msg });
      }

      const sent = results.filter((r) => r.ok).length;
      return new Response(JSON.stringify({ success: true, sent, total: results.length, results }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Envio para destinatários privados.
    // Se reroute_private_to_group estiver ativo (padrão), consolida em um único envio ao grupo.
    // Caso contrário, envia individualmente para cada número privado.
    const rerouteEnabled = (cfg as { reroute_private_to_group?: boolean }).reroute_private_to_group === true;
    const groupFallback = (cfg.group_id || "").trim();

    if (rerouteEnabled) {
      if (!groupFallback) {
        return new Response(JSON.stringify({ error: "group_id não configurado para reroteamento de envios privados" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const names = body.recipients
        .map((r) => (r.name || r.phone || "").toString().trim())
        .filter(Boolean);
      const prefix = names.length ? `👥 *Para:* ${names.join(", ")}\n\n` : "";
      const finalMessage = prefix + body.message;
      const groupEndpoint = buildWapiEndpoint(cfg.instance_url, cfg.instance_id, true);

      try {
        const resp = await fetch(groupEndpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.instance_token}`,
          },
          body: JSON.stringify({ phone: groupFallback, message: finalMessage }),
        });
        const respText = await resp.text();
        let respJson: unknown = null;
        try { respJson = JSON.parse(respText); } catch { respJson = { raw: respText }; }
        const ok = resp.ok;
        await admin.from("wapi_message_logs").insert({
          sent_by: userId,
          recipient_user_id: null,
          recipient_name: `Grupo ${groupFallback} (reroteado)`,
          recipient_phone: groupFallback,
          message: finalMessage,
          status: ok ? "sent" : "failed",
          error_message: ok ? null : `HTTP ${resp.status}: ${respText.slice(0, 200)}`,
          response: respJson as never,
        });
        results.push({ phone: groupFallback, ok, error: ok ? undefined : `HTTP ${resp.status}` });
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Erro desconhecido";
        results.push({ phone: groupFallback, ok: false, error: msg });
      }
    } else {
      // Envio individual privado para cada destinatário
      for (let i = 0; i < body.recipients.length; i++) {
        const r = body.recipients[i];
        const phone = sanitizePhone(r.phone);
        if (!phone) {
          results.push({ phone: r.phone, ok: false, error: "Telefone inválido" });
          continue;
        }
        if (i > 0 && delayMs > 0) await sleep(delayMs);
        try {
          const resp = await fetch(endpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${cfg.instance_token}`,
            },
            body: JSON.stringify({ phone, message: body.message }),
          });
          const respText = await resp.text();
          let respJson: unknown = null;
          try { respJson = JSON.parse(respText); } catch { respJson = { raw: respText }; }
          const ok = resp.ok;
          await admin.from("wapi_message_logs").insert({
            sent_by: userId,
            recipient_user_id: r.user_id ?? null,
            recipient_name: r.name ?? null,
            recipient_phone: phone,
            message: body.message,
            status: ok ? "sent" : "failed",
            error_message: ok ? null : `HTTP ${resp.status}: ${respText.slice(0, 200)}`,
            response: respJson as never,
          });
          results.push({ phone, ok, error: ok ? undefined : `HTTP ${resp.status}` });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Erro desconhecido";
          results.push({ phone, ok: false, error: msg });
        }
      }
    }



    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ success: true, sent, total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
