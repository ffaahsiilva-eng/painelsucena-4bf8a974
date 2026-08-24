// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const WEEKDAY_LABELS = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

const formatDateBR = (iso: string) => {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  try {
    const body = await req.json().catch(() => ({}));
    const { reminder_id, snoozed_until, snoozed_by, recipient_user_ids } = body || {};
    if (!reminder_id || !snoozed_until) {
      return new Response(JSON.stringify({ ok: false, error: "missing params" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Config WhatsApp
    const { data: cfg } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ ok: true, skipped: "wapi disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Lembrete
    const { data: r, error: rErr } = await admin
      .from("reminders")
      .select("*")
      .eq("id", reminder_id)
      .maybeSingle();
    if (rErr) throw rErr;
    if (!r) {
      return new Response(JSON.stringify({ ok: false, error: "reminder not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determina destinatários
    let targetIds: string[] = Array.isArray(recipient_user_ids) ? recipient_user_ids.filter(Boolean) : [];
    if (targetIds.length === 0) {
      if (r.mention_type === "all") {
        const { data: profs } = await admin.from("profiles").select("user_id");
        targetIds = (profs || []).map((p: any) => p.user_id).filter((id: string) => id && id !== r.created_by);
      } else if (r.mention_type === "specific" && Array.isArray(r.mentioned_users)) {
        targetIds = r.mentioned_users.filter((id: string) => id && id !== r.created_by);
      }
    }

    // Quem adiou
    let snoozedByName = "Sistema";
    if (snoozed_by) {
      const { data: prof } = await admin
        .from("profiles").select("full_name").eq("user_id", snoozed_by).maybeSingle();
      snoozedByName = prof?.full_name || "Sistema";
    }

    // Monta mensagem
    const lines: string[] = [];
    lines.push("⏳ *Lembrete Adiado*");
    lines.push("");
    lines.push(`📌 *Título:* ${r.title}`);
    if (r.description && String(r.description).trim()) {
      lines.push(`📝 *Descrição:* ${r.description}`);
    }
    if (r.is_recurring && Array.isArray(r.recurring_days) && r.recurring_days.length > 0) {
      const days = r.recurring_days.map((d: number) => WEEKDAY_LABELS[d]).join(", ");
      lines.push(`🔁 *Recorrente:* ${days}`);
    } else if (r.event_date) {
      lines.push(`📅 *Data original:* ${formatDateBR(r.event_date)}`);
    }
    if (r.event_time) {
      lines.push(`⏰ *Hora:* ${String(r.event_time).slice(0, 5)}`);
    }
    lines.push("");
    lines.push(`📆 *Adiado para:* ${formatDateBR(snoozed_until)}`);
    lines.push(`👤 _Adiado por: ${snoozedByName}_`);
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    // Envio: determina se vai para o grupo ou privado
    const rows: any[] = [];
    
    // Regra: Só envia para o grupo se for "all"
    if (r.mention_type === "all") {
      if (cfg.group_id) {
        rows.push({
          kind: "text",
          target_type: "group",
          phone: cfg.group_id,
          message,
          origin: "reminder_snooze",
        });
      }
    } else {
      // Se não for "all", envia privado para os interessados (incluindo quem adiou se for o criador)
      const finalRecipients = new Set<string>();
      if (snoozed_by) finalRecipients.add(snoozed_by); // Quem adiou sempre recebe confirmação
      if (r.created_by) finalRecipients.add(r.created_by); // Criador sempre recebe
      
      targetIds.forEach(id => finalRecipients.add(id)); // Outros mencionados

      if (finalRecipients.size > 0) {
        const { data: profs } = await admin
          .from("profiles")
          .select("user_id, full_name, whatsapp_number")
          .in("user_id", Array.from(finalRecipients));
          
        for (const p of profs || []) {
          const digits = String(p.whatsapp_number || "").replace(/\D/g, "");
          if (digits.length < 10) continue;
          const phone = digits.length === 10 || digits.length === 11 ? "55" + digits : digits;
          rows.push({
            kind: "text",
            target_type: "contact",
            phone,
            message,
            origin: "reminder_snooze",
            recipient_user_id: p.user_id,
            recipient_name: p.full_name || "",
          });
        }
      }
    }

    if (rows.length === 0) {
      return new Response(JSON.stringify({ ok: true, skipped: "no recipients" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: qErr } = await admin.from("wapi_outbox").insert(rows);
    if (qErr) throw qErr;

    return new Response(JSON.stringify({ ok: true, queued: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ ok: false, error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
