// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Pará UTC-3
const paraDate = () => new Date(Date.now() - 3 * 60 * 60 * 1000);

const colorMonthMap: Record<number, string> = {
  1: "red", 2: "blue", 3: "yellow", 4: "green",
  5: "red", 6: "blue", 7: "yellow", 8: "green",
  9: "red", 10: "blue", 11: "yellow", 12: "green",
};
const colorLabels: Record<string, string> = {
  red: "Vermelho",
  blue: "Azul",
  yellow: "Amarelo",
  green: "Verde",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const admin = createClient(supabaseUrl!, serviceKey!);

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
    if (!cfg.auto_send_sling_inspection_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de cintas desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const groupId = (cfg.group_id_sling_inspection || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Janela: dia 10 ou 28, hora 14h, Pará
    const para = paraDate();
    if (!force) {
      const day = para.getUTCDate();
      const hour = para.getUTCHours();
      if ((day !== 10 && day !== 28) || hour !== 14) {
        return new Response(JSON.stringify({ skipped: true, reason: "Fora da janela (dia 10/28 às 14h)" }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const month = para.getUTCMonth() + 1;
    const year = para.getUTCFullYear();
    const currentColor = colorMonthMap[month];
    const monthYearPrefix = `${year}-${String(month).padStart(2, "0")}`;
    // Último dia do mês corrente (calculado corretamente, evitando "-31" inválido)
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const lastDayISO = `${monthYearPrefix}-${String(lastDay).padStart(2, "0")}`;

    // Cintas da cor do mês
    const { data: slings, error: slErr } = await admin
      .from("sling_equipment")
      .select("id, tag, description, color")
      .eq("color", currentColor)
      .order("tag", { ascending: true });
    if (slErr) {
      console.error("[sling-notify] sling_equipment error:", slErr);
      throw slErr;
    }

    // Inspeções do mês corrente
    const slingIds = (slings || []).map((s) => s.id);
    let inspections: any[] = [];
    if (slingIds.length > 0) {
      const { data: insp, error: iErr } = await admin
        .from("sling_inspections")
        .select("sling_id, status, inspection_date")
        .in("sling_id", slingIds)
        .gte("inspection_date", `${monthYearPrefix}-01`)
        .lte("inspection_date", lastDayISO);
      if (iErr) {
        console.error("[sling-notify] sling_inspections error:", iErr);
        throw iErr;
      }
      inspections = insp || [];
    }

    const pending = (slings || []).filter((s) => {
      const insp = inspections.find((i) => i.sling_id === s.id);
      return !insp || insp.status === "pending";
    });

    if (pending.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "Nenhuma cinta pendente", total: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lines: string[] = [];
    lines.push(`⚠️ *VISTORIAS DE CINTAS PENDENTES*`);
    lines.push(`📅 Mês: *${String(month).padStart(2, "0")}/${year}*`);
    lines.push(`🎨 As cintas da cor *${colorLabels[currentColor] || currentColor}* precisam ser inspecionadas este mês.`);
    lines.push("");
    lines.push(`🔗 *${pending.length} cinta(s) pendente(s):*`);
    lines.push("");
    for (const p of pending) {
      lines.push(`• 🏷️ *${p.tag}* — ${p.description || "(sem descrição)"}`);
    }
    lines.push("");
    lines.push(`📌 Por favor, realizem as inspeções pendentes o quanto antes!`);
    lines.push("");
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    let ok = false;
    let errorMsg: string | null = null;
    try {
      const { error: qErr } = await admin.from("wapi_outbox").insert({
        kind: "text",
        target_type: "group",
        phone: groupId,
        message,
        origin: "sling_inspection",
        recipient_name: "Grupo - Cintas",
      });
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    return new Response(JSON.stringify({
      success: ok,
      total: pending.length,
      currentColor,
      error: errorMsg,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const stack = e instanceof Error ? e.stack : undefined;
    console.error("[sling-notify] runtime error:", msg, stack);
    return new Response(JSON.stringify({ error: msg, stack }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
