// Worker que processa wapi_outbox respeitando o delay_seconds global do W-API.
// Executado pelo pg_cron a cada minuto. Em cada execução, envia quantas
// mensagens couberem dentro do minuto, espaçadas pelo delay configurado.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  try {
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

    const delaySec = Math.max(0, Number(cfg.delay_seconds ?? 5));
    const delayMs = delaySec * 1000;
    const startedAt = Date.now();
    const maxRunMs = 55_000; // sai antes do próximo cron

    let processed = 0;
    let lastDispatched = cfg.last_dispatched_at ? new Date(cfg.last_dispatched_at).getTime() : 0;

    while (Date.now() - startedAt < maxRunMs) {
      // Espera tempo restante até a próxima janela
      const waitMs = Math.max(0, lastDispatched + delayMs - Date.now());
      if (waitMs > 0) {
        if (Date.now() - startedAt + waitMs >= maxRunMs) break;
        await sleep(waitMs);
      }

      // Pega 1 mensagem pendente e marca como processing (lock simples otimista)
      const { data: pending } = await admin
        .from("wapi_outbox")
        .select("*")
        .eq("status", "pending")
        .lte("scheduled_at", new Date().toISOString())
        .order("scheduled_at", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (!pending) break;

      const { data: locked } = await admin
        .from("wapi_outbox")
        .update({ status: "processing", attempts: (pending.attempts ?? 0) + 1 })
        .eq("id", pending.id)
        .eq("status", "pending")
        .select("id")
        .maybeSingle();
      if (!locked) continue; // outro worker pegou

      // Última barreira antes de chamar a W-API: se a fila já tem uma mensagem
      // equivalente pendente/processando/enviada, cancela esta cópia localmente.
      // Isso impede duplicidade mesmo que duas telas/funções enfileirem ao mesmo tempo.
      const isDailyShift =
        (pending.origin === "driver-status" && pending.external_kind === "daily-shift-png-end") ||
        (pending.origin === "daily-shift-report" && pending.external_kind === "daily-shift-record");

      let duplicateFound = false;
      if (isDailyShift && pending.external_id) {
        const { data: duplicateDailyShift } = await admin
          .from("wapi_outbox")
          .select("id")
          .eq("origin", pending.origin)
          .eq("external_kind", pending.external_kind)
          .eq("external_id", pending.external_id)
          .neq("id", pending.id)
          .in("status", ["pending", "processing", "sent"])
          .limit(1);
        duplicateFound = Boolean(duplicateDailyShift && duplicateDailyShift.length > 0);
      }

      if (!duplicateFound && pending.dedupe_key) {
        const { data: duplicateByKey } = await admin
          .from("wapi_outbox")
          .select("id")
          .eq("origin", pending.origin)
          .eq("dedupe_key", pending.dedupe_key)
          .neq("id", pending.id)
          .in("status", ["pending", "processing", "sent"])
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString())
          .limit(1);
        duplicateFound = Boolean(duplicateByKey && duplicateByKey.length > 0);
      }

      if (!duplicateFound) {
        let duplicateByContentQuery = admin
          .from("wapi_outbox")
          .select("id")
          .eq("phone", pending.phone)
          .eq("target_type", pending.target_type)
          .eq("kind", pending.kind)
          .neq("id", pending.id)
          .in("status", ["pending", "processing", "sent"])
          .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());

        duplicateByContentQuery = pending.message == null
          ? duplicateByContentQuery.is("message", null)
          : duplicateByContentQuery.eq("message", pending.message);
        duplicateByContentQuery = pending.caption == null
          ? duplicateByContentQuery.is("caption", null)
          : duplicateByContentQuery.eq("caption", pending.caption);
        duplicateByContentQuery = pending.image_url == null
          ? duplicateByContentQuery.is("image_url", null)
          : duplicateByContentQuery.eq("image_url", pending.image_url);

        const { data: duplicateByContent } = await duplicateByContentQuery.limit(1);
        duplicateFound = Boolean(duplicateByContent && duplicateByContent.length > 0);
      }

      if (duplicateFound) {
        await admin.from("wapi_outbox").update({
          status: "failed",
          last_error: "duplicate-suppressed-before-send",
        }).eq("id", pending.id);
        continue;
      }

      // Reroteamento condicional: quando reroute_private_to_group = true (padrão),
      // mensagens 'contact' são redirecionadas ao grupo principal.
      // Quando desligado, envia normalmente para o número privado.
      let targetPhone = pending.phone;
      let targetType = pending.target_type;
      const rerouteEnabled = cfg.reroute_private_to_group === true;
      // Lembretes SEMPRE são enviados no privado (nunca reroteados).
      const reminderOrigins = new Set(["reminder", "reminder_snooze", "driver-app-reminder"]);
      const isReminder = reminderOrigins.has(String(pending.origin || ""));
      if (pending.target_type === "contact" && rerouteEnabled && !isReminder) {
        // Pedidos privados devem ir para o grupo de Estoque (group_id_orders), nunca para a liderança.
        const isOrder = String(pending.origin || "") === "order";
        const groupFallback = isOrder
          ? (cfg.group_id_orders || "").trim()
          : (cfg.group_id || "").trim();
        if (!groupFallback) {
          await admin.from("wapi_outbox").update({
            status: "failed",
            last_error: isOrder
              ? "Envio de pedido bloqueado: group_id_orders (grupo de Estoque) não configurado"
              : "Envio privado bloqueado: group_id não configurado para reroteamento",
          }).eq("id", pending.id);
          continue;
        }
        targetPhone = groupFallback;
        targetType = "group";
      }

      const isImage = pending.kind === "image" && !!pending.image_url;
      const path = isImage ? "/v1/message/send-image" : "/v1/message/send-text";
      const endpoint = buildWapiUrl(cfg.instance_url, cfg.instance_id, path);
      const payload: Record<string, unknown> = isImage
        ? { phone: targetPhone, image: pending.image_url.replace(/\.webp($|\?)/, ".jpg$1"), caption: pending.caption ?? pending.message ?? "", delayMessage: Math.max(1, Math.min(15, delaySec || 5)) }
        : { phone: targetPhone, message: pending.message ?? "", delayMessage: Math.max(1, Math.min(15, delaySec || 5)) };

      let ok = false;
      let errMsg: string | null = null;
      let respJson: unknown = null;
      try {
        const resp = await fetch(endpoint, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${cfg.instance_token}`,
          },
          body: JSON.stringify(payload),
        });
        const text = await resp.text();
        try { respJson = JSON.parse(text); } catch { respJson = { raw: text }; }
        ok = resp.ok;
        if (!ok) errMsg = `HTTP ${resp.status}: ${text.slice(0, 200)}`;
      } catch (e) {
        errMsg = e instanceof Error ? e.message : "Erro desconhecido";
      }

      // Tenta extrair messageId do retorno da W-API
      let wapiMsgId: string | null = null;
      try {
        const r: any = respJson;
        wapiMsgId = r?.messageId || r?.id || r?.message?.id || null;
      } catch { /* noop */ }

      await admin
        .from("wapi_outbox")
        .update({
          status: ok ? "sent" : "failed",
          sent_at: ok ? new Date().toISOString() : null,
          last_error: errMsg,
          wapi_message_id: wapiMsgId,
        })
        .eq("id", pending.id);

      // Log para auditoria (mesma tabela usada pelo wapi-send)
      await admin.from("wapi_message_logs").insert({
        sent_by: null,
        recipient_user_id: pending.recipient_user_id ?? null,
          recipient_name: pending.recipient_name ?? (targetType === "group" ? `Grupo ${targetPhone}` : null),
          recipient_phone: targetPhone,
        message: pending.message ?? pending.caption ?? "",
        status: ok ? "sent" : "failed",
        error_message: errMsg,
        response: respJson as never,
      });

      lastDispatched = Date.now();
      await admin
        .from("wapi_config")
        .update({ last_dispatched_at: new Date(lastDispatched).toISOString() })
        .eq("id", cfg.id);

      processed++;
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
