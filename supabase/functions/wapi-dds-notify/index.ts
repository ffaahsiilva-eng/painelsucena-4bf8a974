import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Retorna a data alvo em Pará (UTC-3) no formato YYYY-MM-DD
const getParaDateISO = (offsetDays = 0): string => {
  const now = new Date();
  const para = new Date(now.getTime() - 3 * 60 * 60 * 1000 + offsetDays * 24 * 60 * 60 * 1000);
  return para.toISOString().slice(0, 10);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let mode: "today" | "tomorrow" = "today";
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        if (body?.mode === "tomorrow") mode = "tomorrow";
      }
    } catch { /* ignore */ }

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, dds_auto_notify, dds_notify_day_before, group_id, group_id_dds")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "W-API não configurada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const flagOk = mode === "tomorrow" ? cfg.dds_notify_day_before : cfg.dds_auto_notify;
    if (flagOk === false) {
      return new Response(JSON.stringify({ skipped: true, reason: `Lembrete '${mode}' desabilitado` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetGroup = (cfg.group_id_dds || cfg.group_id || "").trim();

    const targetDate = mode === "tomorrow" ? getParaDateISO(1) : getParaDateISO(0);

    const { data: schedules, error: scheduleErr } = await admin
      .from("dds_schedule")
      .select("id, theme, presenter_user_id, external_presenter_name, scheduled_date")
      .eq("scheduled_date", targetDate);

    if (scheduleErr) throw scheduleErr;
    if (!schedules || schedules.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: `Nenhum DDS agendado para ${mode === "tomorrow" ? "amanhã" : "hoje"}`, targetDate }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Array<{ presenter: string; ok: boolean; error?: string }> = [];

    for (const dds of schedules) {
      let presenterName = dds.external_presenter_name ?? "Palestrante";
      let presenterPhone: string | null = null;
      if (dds.presenter_user_id) {
        const { data: profile } = await admin
          .from("profiles")
          .select("full_name, whatsapp_number")
          .eq("user_id", dds.presenter_user_id)
          .maybeSingle();
        if (profile?.full_name) presenterName = profile.full_name;
        if (profile?.whatsapp_number) presenterPhone = String(profile.whatsapp_number).replace(/\D/g, "");
      }

      const dateBR = targetDate.split("-").reverse().join("/");
      const header = mode === "tomorrow"
        ? "🔔 *Lembrete DDS - Amanhã*"
        : "🎤 *Lembrete DDS - Hoje*";
      const dayLabel = mode === "tomorrow" ? "amanhã" : "hoje";
      const message = `${header}\n\n👤 *Palestrante:* ${presenterName}\n📅 *Data:* ${dateBR} (${dayLabel})\n📋 *Tema:* ${dds.theme}\n\n_Mensagem automática - Sucena_`;

      const dedupeKey = `dds-${mode}-${dds.id}-${targetDate}-${presenterPhone || 'nophone'}`;

      let qErr = null;
      if (targetGroup) {
        const { error } = await admin.from("wapi_outbox").insert({
          kind: "text",
          target_type: "group",
          phone: targetGroup,
          message,
          origin: "dds",
          external_kind: "dds-schedule",
          external_id: dds.id,
          dedupe_key: dedupeKey,
        });
        qErr = error;
      }

      // Also send to presenter's personal WhatsApp
      let privateOk = false;
      let privateErr: string | undefined;
      if (presenterPhone && presenterPhone.length >= 10) {
        const phoneFormatted = (presenterPhone.length === 10 || presenterPhone.length === 11)
          ? `55${presenterPhone}` : presenterPhone;
        const privateMsg = `Olá *${presenterName}*,\n\n${header.replace(/\*/g, "")}\n\n📅 *Data:* ${dateBR} (${dayLabel})\n📋 *Tema:* ${dds.theme}\n\nVocê está agendado(a) para apresentar o DDS.\n\n_Mensagem automática - Sucena_`;
        const { error: pErr } = await admin.from("wapi_outbox").insert({
          kind: "text",
          target_type: "contact",
          phone: phoneFormatted,
          message: privateMsg,
          origin: "dds",
          external_kind: "dds-schedule-private",
          external_id: dds.id,
          dedupe_key: `dds-${mode}-${dds.id}-${targetDate}-${presenterPhone || 'nophone'}-private`,
        });
        privateOk = !pErr;
        privateErr = pErr?.message;
      }

      results.push({ presenter: presenterName, ok: !qErr, error: qErr?.message, privateOk, privateErr, privatePhone: presenterPhone });
    }


    const sent = results.filter((r) => r.ok).length;
    return new Response(JSON.stringify({ success: true, mode, targetDate, group: targetGroup, sent, total: results.length, results }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
