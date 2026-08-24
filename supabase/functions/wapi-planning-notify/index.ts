// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

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

async function sendWapiGroupText(cfg: any, groupId: string, message: string) {
  const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { error } = await client.from("wapi_outbox").insert({
    kind: "text",
    target_type: "group",
    phone: groupId,
    message,
    origin: "planning",
  });
  return { ok: !error, status: error ? 500 : 202, body: error ? { error: error.message } : { queued: true } };
}

const fmtNum = (n: number) => {
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(2).replace(/\.?0+$/, "");
};

// Pará UTC-3 today
const paraToday = () => {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const payload = await req.json().catch(() => ({}));
    const { eventType, metaId, force, userName } = payload || {};

    if (!eventType) {
      return new Response(JSON.stringify({ error: "eventType é obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get config
    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled || !cfg.auto_send_planning_alerts) {
      return new Response(JSON.stringify({ skipped: true, reason: "disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const targetGroupId = (cfg.group_id_planning || cfg.group_id || "").trim();
    if (!cfg.instance_url || !cfg.instance_token || !cfg.instance_id || !targetGroupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "missing-config-or-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let message = "";

    if (eventType === "meta_completed") {
      if (!metaId) {
        return new Response(JSON.stringify({ error: "metaId é obrigatório" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data: meta, error: metaErr } = await admin
        .from("planejamento_metas")
        .select("atividade, categoria, meta, realizado, unidade, linha")
        .eq("id", metaId)
        .single();

      if (metaErr || !meta) {
        return new Response(JSON.stringify({ error: "Meta não encontrada" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (Number(meta.realizado) < Number(meta.meta) || Number(meta.meta) <= 0) {
        return new Response(JSON.stringify({ skipped: true, reason: "not-completed" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const unit = meta.unidade ? ` ${meta.unidade}` : "";
      const overshoot = Number(meta.realizado) > Number(meta.meta);
      const percentDone = Number(meta.meta) > 0 ? (Number(meta.realizado) / Number(meta.meta)) * 100 : 0;

      message =
        `🎯 *META CONCLUÍDA NO PLANEJAMENTO*\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Atividade:* ${meta.atividade}\n` +
        (meta.categoria ? `*Categoria:* ${meta.categoria}\n` : "") +
        (meta.linha ? `*Linha:* ${meta.linha}\n` : "") +
        `\n*Meta:* ${fmtNum(Number(meta.meta))}${unit}\n` +
        `*Realizado:* ${fmtNum(Number(meta.realizado))}${unit}\n` +
        `*Atingimento:* ${percentDone.toFixed(2)}%${overshoot ? " 🚀" : ""}\n` +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        `✅ Parabéns! Meta batida no Planejamento Mensal.`;
    } else if (eventType === "monthly_summary" || eventType === "spreadsheet_uploaded") {
      // Trigger only on day 16 (or force)
      const para = paraToday();
      if (para.getUTCDate() !== 16 && !force) {
        return new Response(JSON.stringify({ skipped: true, reason: "not-day-16" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: metas, error: metasErr } = await admin
        .from("planejamento_metas")
        .select("atividade, categoria, meta, realizado, unidade, display_order, is_section_header")
        .order("display_order", { ascending: true });

      if (metasErr) throw metasErr;

      const items = (metas || []).filter(
        (m: any) => !m.is_section_header && Number(m.meta) > 0
      );

      const totalMeta = items.reduce((s: number, m: any) => s + Number(m.meta), 0);
      const totalReal = items.reduce(
        (s: number, m: any) => s + Math.min(Number(m.realizado), Number(m.meta)),
        0,
      );
      const overall = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;

      const completed = items.filter((m: any) => Number(m.realizado) >= Number(m.meta));
      const pending = items.filter((m: any) => Number(m.realizado) < Number(m.meta));

      const monthLabel = `${MONTHS[para.getUTCMonth()]}/${para.getUTCFullYear()}`;

      const completedList = completed.length
        ? completed
            .slice(0, 40)
            .map(
              (m: any) =>
                `✅ ${m.atividade} — ${fmtNum(Number(m.realizado))}/${fmtNum(Number(m.meta))}${m.unidade ? ` ${m.unidade}` : ""}`,
            )
            .join("\n") + (completed.length > 40 ? `\n... e mais ${completed.length - 40}` : "")
        : "_Nenhuma meta concluída._";

      const pendingList = pending.length
        ? pending
            .slice(0, 40)
            .map((m: any) => {
              const real = Number(m.realizado);
              const met = Number(m.meta);
              const falta = Math.max(met - real, 0);
              const pct = met > 0 ? (real / met) * 100 : 0;
              const unit = m.unidade ? ` ${m.unidade}` : "";
              return `❌ ${m.atividade} — ${fmtNum(real)}/${fmtNum(met)}${unit} (${pct.toFixed(0)}%, falta ${fmtNum(falta)}${unit})`;
            })
            .join("\n") + (pending.length > 40 ? `\n... e mais ${pending.length - 40}` : "")
        : "_Todas as metas foram batidas! 🎉_";

      const title = eventType === "spreadsheet_uploaded" 
        ? `📤 *PLANILHA DE PLANEJAMENTO ATUALIZADA*` 
        : `📊 *RESUMO MENSAL DO PLANEJAMENTO*`;

      message =
        `${title}\n` +
        (userName ? `*Por:* ${userName}\n` : "") +
        `*Referência:* ${monthLabel}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `*Avanço Geral:* ${overall.toFixed(2)}%\n` +
        `*Metas concluídas:* ${completed.length}/${items.length}\n` +
        `*Metas pendentes:* ${pending.length}/${items.length}\n` +
        `\n*✅ O QUE FOI CONCLUÍDO:*\n${completedList}\n` +
        `\n*❌ O QUE FALTOU:*\n${pendingList}\n` +
        `\n━━━━━━━━━━━━━━━━━━━━\n` +
        (overall >= 100
          ? `🏆 Excelente! 100% do avanço geral foi atingido. Parabéns à equipe!`
          : overall >= 80
          ? `💪 Bom desempenho! Vamos finalizar o que faltou no próximo ciclo.`
          : `⚠️ Atenção: muitas metas ficaram pendentes. Reforço necessário no próximo ciclo.`);
    } else {
      return new Response(JSON.stringify({ error: "eventType inválido" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await sendWapiGroupText(cfg, targetGroupId, message);

    return new Response(
      JSON.stringify({ success: result.ok, eventType, wapi: result }),
      { status: result.ok ? 200 : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[wapi-planning-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
