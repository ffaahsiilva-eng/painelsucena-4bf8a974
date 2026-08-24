// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FN_VERSION = "v1.0.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const body = await req.json().catch(() => ({}));
    const minuteId: string | null = body?.minute_id ?? null;
    const reason: "item_completed" | "imported" = body?.reason ?? "item_completed";
    const itemId: string | null = body?.item_id ?? null;
    const force: boolean = !!body?.force;

    if (!minuteId) {
      return new Response(JSON.stringify({ error: "minute_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: cfg } = await admin
      .from("wapi_config").select("*")
      .order("updated_at", { ascending: false })
      .limit(1).maybeSingle();

    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "W-API desabilitada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cfg.auto_send_ata_contrato && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Auto-envio Ata desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_ata_contrato || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: minute, error: mErr } = await admin
      .from("meeting_minutes").select("*").eq("id", minuteId).maybeSingle();
    if (mErr || !minute) {
      return new Response(JSON.stringify({ error: "Ata não encontrada" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: items, error: iErr } = await admin
      .from("meeting_minute_items").select("*").eq("minute_id", minuteId)
      .order("sort_order", { ascending: true });
    if (iErr) throw iErr;

    const all = items || [];
    const done = all.filter((i: any) => i.completed);
    const pending = all.filter((i: any) => !i.completed);
    const total = all.length;
    const pct = total ? Math.round((done.length / total) * 100) : 0;

    let triggerItem: any = null;
    if (itemId) triggerItem = all.find((i: any) => i.id === itemId);

    const lines: string[] = [];

    if (reason === "imported") {
      lines.push(`📋 *ATA DE REUNIÃO DE CONTRATO ATUALIZADA*`);
      lines.push(`📄 ${minute.title}`);
      if (minute.meeting_date) {
        const d = minute.meeting_date.split("-");
        lines.push(`📅 Data da reunião: ${d[2]}/${d[1]}/${d[0]}`);
      }
      lines.push("");
      lines.push(`📊 *RESUMO GERAL*`);
      lines.push(`• Total de itens: *${total}*`);
      lines.push(`• Concluídos: *${done.length}* (${pct}%)`);
      lines.push(`• Pendentes: *${pending.length}*`);
    } else {
      lines.push(`✅ *ITEM CONCLUÍDO – ATA DE CONTRATO*`);
      lines.push(`📄 ${minute.title}`);
      lines.push("");
      if (triggerItem) {
        lines.push(`🆕 *Item ${triggerItem.item_number}* concluído:`);
        if (triggerItem.section) lines.push(`📂 Seção: ${triggerItem.section}`);
        const desc = (triggerItem.description || "").slice(0, 400);
        lines.push(`📝 ${desc}${(triggerItem.description || "").length > 400 ? "..." : ""}`);
        if (triggerItem.deadline) lines.push(`⏰ Prazo: ${triggerItem.deadline}`);
      }
      lines.push("");
      lines.push(`📊 *PROGRESSO GERAL*`);
      lines.push(`• Total: *${total}*`);
      lines.push(`• Concluídos: *${done.length}* (${pct}%)`);
      lines.push(`• Pendentes: *${pending.length}*`);
    }

    if (done.length > 0) {
      lines.push("");
      lines.push(`✅ *CONCLUÍDOS (${done.length}):*`);
      const sectionsDone = new Map<string, any[]>();
      for (const it of done) {
        const k = it.section || "Outros";
        if (!sectionsDone.has(k)) sectionsDone.set(k, []);
        sectionsDone.get(k)!.push(it);
      }
      for (const [sec, list] of sectionsDone) {
        lines.push(`▫️ _${sec}_`);
        for (const it of list) {
          const d = (it.description || "").slice(0, 120);
          lines.push(`  • *${it.item_number}* ${d}${(it.description || "").length > 120 ? "..." : ""}`);
        }
      }
    }

    if (pending.length > 0) {
      lines.push("");
      lines.push(`⏳ *PENDENTES (${pending.length}):*`);
      const sectionsPend = new Map<string, any[]>();
      for (const it of pending) {
        const k = it.section || "Outros";
        if (!sectionsPend.has(k)) sectionsPend.set(k, []);
        sectionsPend.get(k)!.push(it);
      }
      for (const [sec, list] of sectionsPend) {
        lines.push(`▫️ _${sec}_`);
        for (const it of list) {
          const d = (it.description || "").slice(0, 120);
          lines.push(`  • *${it.item_number}* ${d}${(it.description || "").length > 120 ? "..." : ""}`);
        }
      }
    }

    lines.push("");
    lines.push(`_Mensagem automática - Sucena_`);

    const message = lines.join("\n");

    const { error: qErr } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: groupId,
      message,
      origin: "ata_contrato",
      recipient_name: "Grupo - Ata Reunião Contrato",
    });

    if (qErr) {
      return new Response(JSON.stringify({ error: qErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      success: true, version: FN_VERSION, reason, total, done: done.length, pending: pending.length,
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
