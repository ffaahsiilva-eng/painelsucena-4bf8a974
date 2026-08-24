// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

// Convert "now" to Pará timezone (UTC-3): no DST.
const paraNow = () => {
  const utc = new Date();
  return new Date(utc.getTime() - 3 * 60 * 60 * 1000);
};
const fmtDateISO = (d: Date) => d.toISOString().split("T")[0];
const fmtTimeHHMM = (d: Date) => `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;

const buildMessage = (r: any, creatorName: string, occurrenceLabel: string) => {
  const lines: string[] = [];
  lines.push(`🔔 *Lembrete: ${occurrenceLabel}*`);
  lines.push("");
  lines.push(`📌 *Título:* ${r.title}`);
  if (r.description && String(r.description).trim().length > 0) {
    lines.push(`📝 *Descrição:* ${r.description}`);
  }
  if (r.is_recurring && Array.isArray(r.recurring_days) && r.recurring_days.length > 0) {
    const days = r.recurring_days.map((d: number) => WEEKDAY_LABELS[d]).join(", ");
    lines.push(`🔁 *Recorrente:* ${days}`);
  } else if (r.event_date) {
    const [y, m, d] = String(r.event_date).split("-");
    lines.push(`📅 *Data:* ${d}/${m}/${y}`);
  }
  if (r.event_time) {
    lines.push(`⏰ *Hora:* ${String(r.event_time).slice(0, 5)}`);
  }
  lines.push("");
  lines.push(`👤 _Criado por: ${creatorName}_`);
  lines.push(`_Mensagem automática - Sucena_`);
  return lines.join("\n");
};

// Compare HH:MM strings.
const timeAtLeast = (currentHHMM: string, target: string) => currentHHMM >= target;

const dateDiffDays = (a: string, b: string) => {
  // a, b in YYYY-MM-DD, both interpreted as UTC midnight.
  const [ay, am, ad] = a.split("-").map(Number);
  const [by, bm, bd] = b.split("-").map(Number);
  const aMs = Date.UTC(ay, am - 1, ad);
  const bMs = Date.UTC(by, bm - 1, bd);
  return Math.round((aMs - bMs) / 86400000);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const now = paraNow();
    const todayISO = fmtDateISO(now);
    const currentHHMM = fmtTimeHHMM(now);

    // 1. Config
    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled || !cfg.auto_send_reminders) {
      return new Response(
        JSON.stringify({ ok: true, skipped: "auto_send_reminders disabled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 2. Buscar lembretes
    const { data: reminders, error: errR } = await admin
      .from("reminders")
      .select("*");
    if (errR) throw errR;

    // Mapa de criadores (nome)
    const creatorIds = Array.from(new Set((reminders || []).map((r: any) => r.created_by)));
    const { data: creatorProfiles } = await admin
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", creatorIds);
    const creatorMap = new Map<string, string>();
    (creatorProfiles || []).forEach((p: any) => creatorMap.set(p.user_id, p.full_name || "Sistema"));

    // 2.1 Snoozes ativos do CRIADOR (snoozed_until >= hoje suprime envio)
    // Quando o criador adia o lembrete, o envio WhatsApp também adia para a data escolhida.
    const reminderIdsAll = (reminders || []).map((r: any) => r.id);
    const creatorByReminder = new Map<string, string>();
    (reminders || []).forEach((r: any) => creatorByReminder.set(r.id, r.created_by));
    const { data: creatorSnoozes } = reminderIdsAll.length
      ? await admin
          .from("reminder_snoozes")
          .select("reminder_id, user_id, snoozed_until")
          .in("reminder_id", reminderIdsAll)
      : { data: [] as any[] };
    // Map reminder_id -> snoozed_until (apenas snooze do criador)
    const creatorSnoozeMap = new Map<string, string>();
    (creatorSnoozes || []).forEach((s: any) => {
      const creator = creatorByReminder.get(s.reminder_id);
      if (creator && s.user_id === creator) {
        creatorSnoozeMap.set(s.reminder_id, s.snoozed_until);
      }
    });

    // 3. Para cada lembrete, calcular ocorrência elegível "agora"
    const eligible: Array<{ reminder: any; occurrenceType: string; occurrenceLabel: string }> = [];

    for (const r of reminders || []) {
      const desiredTime = (r.event_time ? String(r.event_time).slice(0, 5) : "06:00");

      // Se o criador adiou para uma data futura, não envia hoje.
      const snoozedUntil = creatorSnoozeMap.get(r.id);
      if (snoozedUntil && snoozedUntil > todayISO) {
        continue;
      }

      // Se o lembrete foi adiado pelo criador exatamente para HOJE, envia como ocorrência "snoozed"
      if (snoozedUntil && snoozedUntil === todayISO) {
        if (timeAtLeast(currentHHMM, desiredTime)) {
          eligible.push({ reminder: r, occurrenceType: `snoozed_${todayISO}`, occurrenceLabel: "Adiado para hoje" });
        }
        continue;
      }

      if (r.is_recurring && Array.isArray(r.recurring_days) && r.recurring_days.length > 0) {
        // Hoje é dia da semana?
        const todayDow = (() => {
          const [y, m, d] = todayISO.split("-").map(Number);
          return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
        })();
        if (!r.recurring_days.includes(todayDow)) continue;
        if (!timeAtLeast(currentHHMM, desiredTime)) continue;
        eligible.push({ reminder: r, occurrenceType: "recurring", occurrenceLabel: "Hoje" });
        continue;
      }

      if (!r.event_date) continue;
      const diff = dateDiffDays(r.event_date, todayISO); // dias até evento

      // No dia
      if (diff === 0 && r.show_on_event_day) {
        if (timeAtLeast(currentHHMM, desiredTime)) {
          eligible.push({ reminder: r, occurrenceType: "same_day", occurrenceLabel: "Hoje é o dia!" });
        }
      }

      // Aviso antecipado
      const alert = Number(r.alert_days_before || 0);
      if (alert > 0 && diff > 0 && diff <= alert) {
        // Aviso antecipado dispara às 06:00 (sempre), não no event_time
        if (timeAtLeast(currentHHMM, "06:00")) {
          const lbl = diff === 1 ? "Amanhã" : `Faltam ${diff} dias`;
          eligible.push({ reminder: r, occurrenceType: `prior_${diff}`, occurrenceLabel: lbl });
        }
      }
    }

    if (eligible.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, todayISO, currentHHMM }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 4. Filtrar os já enviados
    const reminderIds = Array.from(new Set(eligible.map((e) => e.reminder.id)));
    const { data: already } = await admin
      .from("reminder_notifications_sent")
      .select("reminder_id, occurrence_type, scheduled_for_date")
      .in("reminder_id", reminderIds)
      .eq("scheduled_for_date", todayISO);
    const sentSet = new Set((already || []).map((a: any) => `${a.reminder_id}:${a.occurrence_type}`));

    const toSend = eligible.filter((e) => !sentSet.has(`${e.reminder.id}:${e.occurrenceType}`));

    if (toSend.length === 0) {
      return new Response(
        JSON.stringify({ ok: true, processed: 0, alreadySent: eligible.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // 5. Para cada elegível, despachar via wapi-send
    const results: any[] = [];
    for (const item of toSend) {
      const r = item.reminder;
      const creatorName = creatorMap.get(r.created_by) || "Sistema";
      const message = buildMessage(r, creatorName, item.occurrenceLabel);
      let recipientsCount = 0;
      let channel = "";
      let invokeBody: any = null;

      if (r.mention_type === "all") {
        const remindersGroupId = (cfg.group_id_reminders || cfg.group_id || "").trim();
        if (!remindersGroupId) {
          results.push({ id: r.id, skipped: "no group_id" });
          continue;
        }
        invokeBody = { group_id: remindersGroupId, message };
        channel = "group";
        recipientsCount = 1;
      } else {
        const targets = new Set<string>();
        targets.add(r.created_by);
        if (r.mention_type === "specific" && Array.isArray(r.mentioned_users)) {
          r.mentioned_users.forEach((u: string) => targets.add(u));
        }
        const userIds = Array.from(targets);
        const { data: profs } = await admin
          .from("profiles")
          .select("user_id, full_name, whatsapp_number")
          .in("user_id", userIds);
        const recipients = (profs || [])
          .filter((p: any) => (p.whatsapp_number || "").replace(/\D/g, "").length >= 10)
          .map((p: any) => ({ user_id: p.user_id, name: p.full_name || "", phone: p.whatsapp_number }));
        if (recipients.length === 0) {
          results.push({ id: r.id, skipped: "no recipients" });
          continue;
        }
        invokeBody = { recipients, message };
        channel = "private";
        recipientsCount = recipients.length;
      }

      // Enfileira no wapi_outbox (worker respeita delay global)
      const rows: any[] = [];
      if (channel === "group") {
        rows.push({ kind: "text", target_type: "group", phone: invokeBody.group_id, message, origin: "reminder" });
      } else {
        for (const rec of invokeBody.recipients) {
          const digits = String(rec.phone || "").replace(/\D/g, "");
          const phone = digits.length === 10 || digits.length === 11 ? "55" + digits : digits;
          if (!phone) continue;
          rows.push({ kind: "text", target_type: "contact", phone, message, origin: "reminder", recipient_user_id: rec.user_id, recipient_name: rec.name });
        }
      }
      const { error: qErr } = rows.length ? await admin.from("wapi_outbox").insert(rows) : { error: null };
      const ok = !qErr;
      const respText = qErr?.message ?? "";


      // Registra envio (independente de sucesso/falha por destinatário individual)
      if (ok) {
        await admin.from("reminder_notifications_sent").insert({
          reminder_id: r.id,
          scheduled_for_date: todayISO,
          occurrence_type: item.occurrenceType,
          recipients_count: recipientsCount,
          channel,
        });
      }

      results.push({ id: r.id, occurrenceType: item.occurrenceType, ok, channel, recipientsCount, error: ok ? null : respText.slice(0, 200) });
    }

    return new Response(
      JSON.stringify({ ok: true, processed: results.length, results, todayISO, currentHHMM }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
