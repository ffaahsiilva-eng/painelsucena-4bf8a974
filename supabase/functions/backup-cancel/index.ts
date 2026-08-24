// Cancela um backup em andamento marcando como falho.
// O próximo segmento encadeado vê status != "running" e encerra a cadeia.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { backup_id, user_id } = await req.json().catch(() => ({}));
    if (!backup_id) {
      return new Response(JSON.stringify({ error: "backup_id obrigatório" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: job } = await admin.from("backup_jobs").select("status").eq("id", backup_id).maybeSingle();
    if (!job) {
      return new Response(JSON.stringify({ error: "Backup não encontrado" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.status !== "running" && job.status !== "pending") {
      return new Response(JSON.stringify({ error: "Backup não está em andamento" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await admin.from("backup_jobs").update({
      status: "failed",
      error_message: "Cancelado pelo usuário",
      finished_at: new Date().toISOString(),
      last_progress_at: new Date().toISOString(),
    }).eq("id", backup_id);

    await admin.from("backup_audit_log").insert({
      backup_id,
      action: "cancel",
      user_id: user_id || null,
      details: { message: "Cancelado manualmente pelo administrador" },
    });

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
