// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Mirror the cargo definitions from src/pages/Matriz.tsx
const CARGO_FOLDERS = [
  { id: "preposto", cargoType: "preposto", cargoLabel: "Preposto", taskIds: ["p1", "p2", "p3", "p4", "p5"] },
  { id: "encarregado-geral", cargoType: "encarregado_geral", cargoLabel: "Encarregado Geral", taskIds: ["eg1", "eg2", "eg3"] },
  { id: "encarregado-i", cargoType: "encarregado_i", cargoLabel: "Encarregado I", taskIds: ["e1-1", "e1-2", "e1-3"] },
  { id: "encarregado-ii", cargoType: "encarregado_ii", cargoLabel: "Encarregado II", taskIds: ["e2-1", "e2-2", "e2-3"] },
  { id: "tecnico-seguranca-i", cargoType: "tecnico_seguranca_i", cargoLabel: "Téc. Segurança I", taskIds: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
  { id: "tecnico-seguranca-ii", cargoType: "tecnico_seguranca_ii", cargoLabel: "Téc. Segurança II", taskIds: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
];

const sanitizePhone = (raw) => {
  let digits = (raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10 || digits.length === 11) digits = "55" + digits;
  return digits;
};

const buildWapiEndpoint = (rawUrl, instanceId) => {
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

// Pará UTC-3 month-year YYYY-MM
const paraMonthYear = () => {
  const now = new Date();
  const para = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return `${para.getUTCFullYear()}-${String(para.getUTCMonth() + 1).padStart(2, "0")}`;
};

const monthLabelPT = (ym) => {
  const [y, m] = ym.split("-").map(Number);
  const meses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
  return `${meses[m - 1]}/${y}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl, serviceKey);

    let force = false;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        force = !!body?.force;
      }
    } catch { /* ignore */ }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      return new Response(JSON.stringify({ skipped: true, reason: "W-API não configurada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (cfg.auto_send_matrix_alert === false && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de Matriz desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_matrix || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthYear = paraMonthYear();

    // Mesmo critério visual da tela: uma tarefa está concluída se existe
    // qualquer marcação dela no mês atual. O card do cargo soma task_id único.
    const { data: completions, error: compErr } = await admin
      .from("matrix_task_completions")
      .select("task_id")
      .eq("month_year", monthYear);
    if (compErr) throw compErr;

    const completedTaskIds = new Set((completions || []).map((item) => item.task_id));

    // Fetch custom tasks added per cargo (id matches folder.id)
    const { data: customRows } = await admin
      .from("matrix_custom_tasks")
      .select("id, cargo_id, name");
    const customByCargo: Record<string, { id: string; name: string }[]> = {};
    for (const row of customRows || []) {
      const cid = (row as any).cargo_id as string;
      if (!customByCargo[cid]) customByCargo[cid] = [];
      customByCargo[cid].push({ id: (row as any).id, name: (row as any).name });
    }
    const dynamicNameMap: Record<string, string> = {};
    for (const list of Object.values(customByCargo)) {
      for (const t of list) dynamicNameMap[t.id] = t.name;
    }

    // Fetch hidden default tasks (admin removed from matrix)
    const { data: hiddenRows } = await admin
      .from("matrix_hidden_tasks")
      .select("task_id");
    const hiddenSet = new Set((hiddenRows || []).map((r: any) => r.task_id));

    // Busca responsáveis (profiles) por cargo
    const cargoTypes = CARGO_FOLDERS.map((f) => f.cargoType);
    const { data: profilesByCargo } = await admin
      .from("profiles")
      .select("full_name, cargo")
      .in("cargo", cargoTypes);

    const responsaveisPorCargo: Record<string, string[]> = {};
    for (const p of profilesByCargo || []) {
      const c = (p as any).cargo as string;
      const n = ((p as any).full_name as string)?.trim();
      if (!c || !n) continue;
      if (!responsaveisPorCargo[c]) responsaveisPorCargo[c] = [];
      responsaveisPorCargo[c].push(n);
    }

    const sections = CARGO_FOLDERS.map((folder) => {
      const extraIds = (customByCargo[folder.id] || []).map((t) => t.id);
      const visibleDefault = folder.taskIds.filter((t) => !hiddenSet.has(t));
      const allTaskIds = [...visibleDefault, ...extraIds];
      const doneTaskIds = allTaskIds.filter((taskId) => completedTaskIds.has(taskId));
      const missingTaskIds = allTaskIds.filter((taskId) => !completedTaskIds.has(taskId));
      const done = doneTaskIds.length;
      const total = allTaskIds.length;
      const progress = total > 0 ? Math.round((done / total) * 100) : 0;
      const responsaveis = (responsaveisPorCargo[folder.cargoType] || []).sort((a, b) => a.localeCompare(b, "pt-BR"));

      return {
        cargoLabel: folder.cargoLabel,
        done,
        total,
        progress,
        isComplete: total > 0 && done === total,
        missingNames: missingTaskIds.map((id) => TASK_NAME_MAP[id] || dynamicNameMap[id] || id),
        responsaveis,
      };
    });

    const pendingSections = sections.filter((s) => !s.isComplete);
    const totalPending = pendingSections.length;
    const totalSections = sections.length;

    const lines = [];
    lines.push(`📊 *MATRIZ DE RESPONSABILIDADES*`);
    lines.push(`📅 Mês de referência: *${monthLabelPT(monthYear)}*`);
    lines.push("");

    if (totalSections === 0) {
      lines.push(`ℹ️ Nenhum cargo da Matriz cadastrado.`);
    } else if (totalPending === 0) {
      lines.push(`✅ *MATRIZ 100% CONCLUÍDA neste mês!*`);
      lines.push("");
      lines.push(`🎉 *PARABÉNS A TODA A EQUIPE!* 🎉`);
      lines.push(`Excelente engajamento e compromisso com a segurança! 👏👏👏`);
    } else {
      lines.push(`⚠️ *${totalPending} cargo(s) ainda não estão 100% concluídos:*`);
      lines.push("");
      for (const s of sections) {
        lines.push(`━━━━━━━━━━━━━━━━━━━━`);
        lines.push(`${s.isComplete ? "✅" : "⚠️"} *${s.cargoLabel}* — *${s.done}/${s.total} salvos* (${s.progress}%)`);
        if (s.responsaveis && s.responsaveis.length > 0) {
          lines.push(`     👤 Responsável(is): ${s.responsaveis.join(", ")}`);
        } else {
          lines.push(`     👤 Responsável(is): _não cadastrado_`);
        }
        if (!s.isComplete) {
          for (const n of s.missingNames) lines.push(`     ⛔ ${n}`);
        }
      }
      lines.push("");
      lines.push(`📌 Status enviado conforme a Matriz aparece no sistema.`);
    }

    lines.push("");
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    let ok = false;
    let errorMsg: string | null = null;
    try {
      const { error: qErr } = await admin.from("wapi_outbox").insert({
        kind: "text", target_type: "group", phone: groupId, message, origin: "matrix",
        recipient_name: "Grupo - Matriz",
      });
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    return new Response(JSON.stringify({
      success: ok,
      monthYear,
      totalSections,
      totalPending,
      error: errorMsg,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Names of tasks (mirrored from src/pages/Matriz.tsx)
const TASK_NAME_MAP = {
  // Preposto
  "p1": "DDS de Liderança",
  "p2": "WOC - Caminhar, Observar e Conversar",
  "p3": "Observação de Tarefas",
  "p4": "Inspeção em HSE",
  "p5": "Roda de Conversa",
  // Encarregado Geral
  "eg1": "Evento sem Lesão / Condição de Risco",
  "eg2": "Observação de Tarefa",
  "eg3": "Inspeção de HSE",
  // Encarregado I
  "e1-1": "Evento sem Lesão / Condição de Risco",
  "e1-2": "Observação de Tarefa",
  "e1-3": "Inspeção de HSE",
  // Encarregado II
  "e2-1": "Evento sem Lesão / Condição de Risco",
  "e2-2": "Observação de Tarefa",
  "e2-3": "Inspeção de HSE",
  // Téc. Segurança I
  "ts1-1": "DDS da Liderança",
  "ts1-2": "WOC - Caminhar, Observar e Conversar",
  "ts1-3": "Inspeção de HSE",
  "ts1-4": "Evento sem Lesão / Condição de Risco (ALTO RISCO)",
  "ts1-5": "Coach em HSE",
  "ts1-6": "Observação de Tarefa",
  // Téc. Segurança II
  "ts2-1": "DDS da Liderança",
  "ts2-2": "WOC - Caminhar, Observar e Conversar",
  "ts2-3": "Inspeção de HSE",
  "ts2-4": "Evento sem Lesão / Condição de Risco (ALTO RISCO)",
  "ts2-5": "Coach em HSE",
  "ts2-6": "Observação de Tarefa",
};
