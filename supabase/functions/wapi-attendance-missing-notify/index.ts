// @ts-nocheck
// Alerta 10h Pará (seg-sex) se Lista de Presença de Gabião ou Jardinagem
// ainda não foi registrada no dia. Envia mensagem ao grupo via wapi_outbox.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const force = url.searchParams.get("force") === "1";

    // Horário Pará (UTC-3). Não enviar sábado (6) e domingo (0).
    const now = new Date();
    const paraTime = new Date(now.getTime() - 3 * 60 * 60 * 1000);
    const dow = paraTime.getUTCDay();
    if (!force && (dow === 0 || dow === 6)) {
      return new Response(JSON.stringify({ skipped: true, reason: "weekend" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const y = paraTime.getUTCFullYear();
    const m = String(paraTime.getUTCMonth() + 1).padStart(2, "0");
    const d = String(paraTime.getUTCDate()).padStart(2, "0");
    const today = `${y}-${m}-${d}`;

    const { data: cfg } = await admin
      .from("wapi_config")
      .select("enabled, group_id, group_id_attendance, auto_send_attendance")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const targetGroupId = (cfg?.group_id_attendance || cfg?.group_id || "").trim();
    if (!cfg || !cfg.enabled || !targetGroupId) {
      return new Response(
        JSON.stringify({ skipped: true, reason: "disabled-or-no-group" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const { data: marks, error: mErr } = await admin
      .from("attendance_daily_marks")
      .select("area")
      .eq("date", today)
      .in("area", ["gabiao", "jardinagem"]);

    if (mErr) {
      return new Response(JSON.stringify({ error: mErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const areasRegistradas = new Set((marks || []).map((r: any) => r.area));
    const faltando: string[] = [];
    if (!areasRegistradas.has("gabiao")) faltando.push("🧱 *Gabião*");
    if (!areasRegistradas.has("jardinagem")) faltando.push("🌿 *Jardinagem*");

    if (faltando.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "all-registered" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const dataBr = `${d}/${m}/${y}`;
    let message = `⚠️ *LISTA DE PRESENÇA PENDENTE*\n`;
    message += `📅 ${dataBr}\n`;
    message += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    message += `Ainda não foi registrada a Lista de Presença de hoje:\n\n`;
    faltando.forEach((f) => { message += `• ${f}\n`; });
    message += `\n_Por favor, registrem o quanto antes._`;

    const { error: insErr } = await admin.from("wapi_outbox").insert({
      kind: "text",
      target_type: "group",
      phone: targetGroupId,
      message,
      origin: "attendance_missing_alert",
    });

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ queued: true, faltando }), {
      status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[wapi-attendance-missing-notify] error:", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
