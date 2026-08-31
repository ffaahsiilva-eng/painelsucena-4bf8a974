// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EXIT_REASON_LABELS: Record<string, string> = {
  manutencao_corretiva: "🔧 Manutenção Corretiva",
  manutencao_preventiva: "🛠️ Manutenção Preventiva",
  vistoria: "🔎 Vistoria",
  operando: "🟢 Operando",
  aguardando_frente_servico: "⏸️ Aguardando Frente de Serviço",
  fim_turno: "🌙 Fim de Turno",
};

const buildWapiGroupEndpoint = (rawUrl: string, instanceId: string): string => {
  const url = new URL(rawUrl.trim());
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }
  if (!url.pathname.replace(/\/+$/, "").endsWith("/send-text")) {
    url.pathname = "/v1/message/send-text";
  }
  url.searchParams.set("instanceId", instanceId);
  return url.toString();
};

async function sendWapiGroupText(cfg: any, groupId: string, message: string, admin?: any) {
  // Enfileira para envio respeitando delay global do worker
  const client = admin ?? createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await client.from("wapi_outbox").insert({
    kind: "text",
    target_type: "group",
    phone: groupId,
    message,
    origin: "equipment-movement",
  });
  return { ok: !error, status: error ? 500 : 202, body: error ? { error: error.message } : { queued: true } };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const { movementId } = payload || {};

    if (!movementId) {
      return new Response(JSON.stringify({ error: "movementId é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get config
    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || cfg.auto_send_equipment_movements === false) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetGroupId = (cfg.group_id_equipment_movements || cfg.group_id || "").trim();
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config-or-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch movement
    const { data: mov, error: movErr } = await admin
      .from("equipment_movements")
      .select("id, equipment_name, plate, movement_type, movement_date, movement_time, exit_reason, problem_description, observation, created_by")
      .eq("id", movementId)
      .single();

    if (movErr || !mov) {
      return new Response(JSON.stringify({ error: "Movimentação não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch creator name
    let creatorName = "—";
    if (mov.created_by) {
      const { data: prof } = await admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", mov.created_by)
        .maybeSingle();
      creatorName = prof?.full_name || "—";
    }

    const isExit = mov.movement_type === "saida";
    const headerEmoji = isExit ? "🚪➡️" : "⬅️🏠";
    const headerLabel = isExit ? "SAÍDA DE EQUIPAMENTO" : "ENTRADA DE EQUIPAMENTO";

    const dateBR = mov.movement_date
      ? new Date(mov.movement_date + "T00:00:00").toLocaleDateString("pt-BR")
      : "—";
    const timeBR = (mov.movement_time || "").toString().slice(0, 5);

    const reasonLabel = mov.exit_reason
      ? (EXIT_REASON_LABELS[mov.exit_reason] || mov.exit_reason)
      : (isExit ? "—" : "Retorno ao canteiro");

    let message =
      `${headerEmoji} *${headerLabel}*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `*Equipamento:* ${mov.equipment_name}\n` +
      `*Placa/ID:* ${mov.plate}\n` +
      `*Data:* ${dateBR}\n` +
      `*Horário:* ${timeBR}\n`;

    // Se for entrada, busca a última saída para contexto
    if (!isExit) {
      const { data: lastExit } = await admin
        .from("equipment_movements")
        .select("movement_date, movement_time")
        .eq("plate", mov.plate)
        .eq("movement_type", "saida")
        .or(`movement_date.lt.${mov.movement_date},and(movement_date.eq.${mov.movement_date},movement_time.lt.${mov.movement_time})`)
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastExit) {
        const exitDateBR = new Date(lastExit.movement_date + "T00:00:00").toLocaleDateString("pt-BR");
        const exitTimeBR = (lastExit.movement_time || "").toString().slice(0, 5);
        message += `*Última Saída:* ${exitDateBR} às ${exitTimeBR}\n`;
      } else {
        message += `*Última Saída:* Sem registro anterior\n`;
      }
    }

    message += `*${isExit ? "Motivo da Saída" : "Tipo"}:* ${reasonLabel}\n`;

    if (mov.problem_description) {
      message += `\n*Descrição do problema:*\n${mov.problem_description}\n`;
    }
    if (mov.observation) {
      message += `\n*Observação:*\n${mov.observation}\n`;
    }

    message +=
      `\n*Registrado por:* ${creatorName}\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    const result = await sendWapiGroupText(cfg, targetGroupId, message);

    return new Response(
      JSON.stringify({ success: result.ok, movement_type: mov.movement_type, wapi: result }),
      { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[wapi-equipment-movement-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
