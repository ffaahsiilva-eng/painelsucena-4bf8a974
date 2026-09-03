// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment",
};

const HYDRO_HOLIDAYS_2026 = [
  { date: "2026-01-01", label: "Confraternização Universal", type: "feriado" },
  { date: "2026-02-16", label: "Carnaval", type: "carnaval" },
  { date: "2026-02-17", label: "Carnaval", type: "carnaval" },
  { date: "2026-02-18", label: "Quarta de Cinzas (Dia Compensado)", type: "compensado" },
  { date: "2026-04-03", label: "Paixão de Cristo", type: "feriado" },
  { date: "2026-04-20", label: "Dia Compensado", type: "compensado" },
  { date: "2026-04-21", label: "Tiradentes", type: "feriado" },
  { date: "2026-05-01", label: "Dia do Trabalhador", type: "feriado" },
  { date: "2026-06-04", label: "Corpus Christi", type: "feriado" },
  { date: "2026-06-05", label: "Dia Compensado", type: "compensado" },
  { date: "2026-09-07", label: "Independência do Brasil", type: "feriado" },
  { date: "2026-10-12", label: "N. Sra. Aparecida / Dia das Crianças", type: "feriado" },
  { date: "2026-11-02", label: "Finados", type: "feriado" },
  { date: "2026-11-15", label: "Proclamação da República", type: "feriado" },
  { date: "2026-11-20", label: "Dia da Consciência Negra", type: "feriado" },
  { date: "2026-12-03", label: "Feriado Municipal - São Francisco Xavier", type: "feriado" },
  { date: "2026-12-04", label: "Dia Compensado", type: "compensado" },
  { date: "2026-12-25", label: "Natal", type: "feriado" },
];

async function sendWapiText(admin: any, target: string, type: 'group' | 'contact', message: string) {
  const { error } = await admin.from("wapi_outbox").insert({
    kind: "text",
    target_type: type,
    phone: target,
    message,
    origin: "planned-activities-reminder",
  });
  return { ok: !error, error };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    // Get Brazil/Para Time (UTC-3)
    const now = new Date();
    const paraTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dow = paraTime.getUTCDay(); // 0=Sun, 6=Sat
    const dateStr = paraTime.toISOString().slice(0, 10);

    // Only Monday-Friday
    if (dow === 0 || dow === 6) {
      return new Response(JSON.stringify({ skipped: true, reason: "weekend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check holidays or compensated days (Calendário Hydro)
    const holiday = HYDRO_HOLIDAYS_2026.find(h => h.date === dateStr);
    if (holiday) {
      return new Response(JSON.stringify({ skipped: true, reason: "holiday-or-compensated", label: holiday.label }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if activities are already saved for today
    // We check rdo_reports for planned_gabiao_locked or planned_jardinagem_locked for today
    const { data: report, error: reportErr } = await admin
      .from("rdo_reports")
      .select("planned_gabiao_locked, planned_jardinagem_locked")
      .eq("date", dateStr)
      .maybeSingle();

    if (reportErr) throw reportErr;

    const gabiaoLocked = report?.planned_gabiao_locked || false;
    const jardinagemLocked = report?.planned_jardinagem_locked || false;

    // If both are locked, no need to remind
    if (gabiaoLocked && jardinagemLocked) {
      return new Response(JSON.stringify({ skipped: true, reason: "already-locked" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get config for group ID
    const { data: cfg } = await admin.from("wapi_config").select("*").limit(1).single();
    if (!cfg || !cfg.enabled) {
      return new Response(JSON.stringify({ skipped: true, reason: "wapi-disabled" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetGroupId = (cfg.group_id_planned_activities || cfg.group_id || "").trim();
    if (!targetGroupId) {
       return new Response(JSON.stringify({ skipped: true, reason: "missing-group" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const missingAreas = [];
    if (!gabiaoLocked) missingAreas.push("Gabião");
    if (!jardinagemLocked) missingAreas.push("Jardinagem");

    const formattedDate = paraTime.toLocaleDateString('pt-BR');
    
    // Message for the group
    const groupMessage = `⚠️ *LEMBRETE: ATIVIDADES PREVISTAS*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n\n` +
      `Olá Encarregados, notamos que o planejamento de *${missingAreas.join(" e ")}* para hoje (${formattedDate}) ainda não foi enviado.\n\n` +
      `📲 Por favor, acessem o app *Sucena*, marquem as atividades previstas e cliquem em *Salvar e Bloquear* para realizar o envio automático ao grupo.\n\n` +
      `━━━━━━━━━━━━━━━━━━━━`;

    // Send to group
    await sendWapiText(admin, targetGroupId, "group", groupMessage);

    // Send to responsible users (encarregados: aux_administrativo, aux_almoxarifado, or admin)
    // Actually, usually the "encarregados" are specialized roles. 
    // The user mentioned "PV dos encarregados". We'll fetch users with specific roles or those who usually manage this.
    const { data: encarregados } = await admin
      .from("profiles")
      .select("phone, full_name")
      .in("cargo", ["aux_administrativo", "aux_almoxarifado", "admin"])
      .not("phone", "is", null);

    const pvMessage = `⚠️ *LEMBRETE SUCENA*\n\n` +
      `Olá, não esqueça de enviar as *Atividades Previstas* de *${missingAreas.join(" e ")}* para hoje (${formattedDate}).\n\n` +
      `O planejamento ainda não foi bloqueado no sistema.`;

    if (encarregados) {
      for (const enc of encarregados) {
        if (enc.phone) {
          // Clean phone number (remove non-digits, ensuring it's in a format wapi expects)
          const cleanPhone = enc.phone.replace(/\D/g, "");
          if (cleanPhone.length >= 10) {
            await sendWapiText(admin, cleanPhone, "contact", pvMessage);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, missingAreas }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("[planned-activities-reminder] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
