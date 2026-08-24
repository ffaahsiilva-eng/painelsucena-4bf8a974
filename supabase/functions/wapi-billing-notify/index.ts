// @ts-nocheck
// Cobrança mensal automática da implementação do WhatsApp.
// Enviada no grupo todo dia 25 às 09:00 (Pará UTC-3) quando habilitada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Pará UTC-3
const paraDate = () => new Date(Date.now() - 3 * 60 * 60 * 1000);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
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

    if (!cfg.auto_send_billing_alert && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: "Cobrança desabilitada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_billing || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const para = paraDate();
    const day = para.getUTCDate();
    const hour = para.getUTCHours();
    const month = para.getUTCMonth();
    const year = para.getUTCFullYear();

    // Só envia no dia 25, às 09h Pará (exceto force=true para teste)
    if (!force && (day !== 25 || hour !== 9)) {
      return new Response(JSON.stringify({
        skipped: true,
        reason: `Fora da janela (Pará: dia ${day}, ${hour}h)`,
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const monthName = MONTH_NAMES[month];

    const VALOR_POR_USUARIO = 2.50;
    const fmtBRL = (n: number) =>
      n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    const lines: string[] = [];
    lines.push(`💰 *COBRANÇA MENSAL - WHATSAPP AUTOMÁTICO*`);
    lines.push("");
    lines.push(`📅 Referência: *${monthName}/${year}*`);
    lines.push("");
    lines.push(`Olá! Segue a cobrança referente à mensalidade da implementação do sistema de mensagens automáticas no WhatsApp.`);
    lines.push("");
    lines.push(`💵 *Valor por usuário:* *${fmtBRL(VALOR_POR_USUARIO)}*`);
    lines.push(`_(todos os usuários devem pagar este valor)_`);
    lines.push("");
    lines.push(`🏦 *Dados para pagamento via PIX:*`);
    lines.push(`• Chave PIX (Telefone): *07027339382*`);
    lines.push(`• Banco: *Inter*`);
    lines.push(`• Favorecido: *Domingues Fabrício*`);
    lines.push("");
    lines.push(`📌 Vencimento: *todo dia 25 de cada mês*`);
    lines.push("");
    lines.push(`Após o pagamento, por gentileza, envie o comprovante neste grupo. 🙏`);
    lines.push("");
    lines.push(`_Mensagem automática - Sucena_`);
    const message = lines.join("\n");

    let ok = false;
    let errorMsg: string | null = null;
    try {
      const { error: qErr } = await admin.from("wapi_outbox").insert({
        kind: "text", target_type: "group", phone: groupId, message, origin: "billing",
        recipient_name: "Grupo - Cobrança Mensal WhatsApp",
      });
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    return new Response(JSON.stringify({ success: ok, month: monthName, error: errorMsg }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Erro";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
