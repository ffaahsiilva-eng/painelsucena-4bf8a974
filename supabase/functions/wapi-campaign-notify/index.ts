// @ts-nocheck
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-environment, cache-control, pragma, expires, x-desktop-app, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Espelha src/data/campaignData.ts
const CAMPAIGN_DATA = [
  { month: 1, monthName: "Janeiro", campaigns: [
    { name: "Janeiro Branco", colorName: "Branco", description: "Conscientização sobre a saúde mental, estimulando o cuidado emocional e psicológico." },
    { name: "Janeiro Roxo", colorName: "Roxo", description: "Prevenção e tratamento à hanseníase, doença infecciosa crônica e curável." },
  ]},
  { month: 2, monthName: "Fevereiro", campaigns: [
    { name: "Fevereiro Roxo", colorName: "Roxo", description: "Conscientização sobre lúpus, fibromialgia e mal de Alzheimer." },
    { name: "Fevereiro Laranja", colorName: "Laranja", description: "Campanha de sensibilização sobre a leucemia." },
  ]},
  { month: 3, monthName: "Março", campaigns: [
    { name: "Março Azul", colorName: "Azul", description: "Prevenção ao câncer colorretal, um dos tipos mais comuns de câncer." },
  ]},
  { month: 4, monthName: "Abril", campaigns: [
    { name: "Abril Verde", colorName: "Verde", description: "Conscientização sobre a importância da segurança no trabalho." },
    { name: "Abril Azul", colorName: "Azul", description: "Debate e conscientização sobre o Transtorno do Espectro Autista (TEA)." },
  ]},
  { month: 5, monthName: "Maio", campaigns: [
    { name: "Maio Amarelo", colorName: "Amarelo", description: "Prevenção dos acidentes de trânsito e promoção da segurança viária." },
  ]},
  { month: 6, monthName: "Junho", campaigns: [
    { name: "Junho Vermelho", colorName: "Vermelho", description: "Importância da doação de sangue e incentivo aos doadores." },
    { name: "Junho Laranja", colorName: "Laranja", description: "Conscientização sobre a anemia e a leucemia." },
  ]},
  { month: 7, monthName: "Julho", campaigns: [
    { name: "Julho Amarelo", colorName: "Amarelo", description: "Conscientização sobre hepatites virais e câncer ósseo." },
    { name: "Julho Verde", colorName: "Verde", description: "Sensibilização e combate ao câncer de cabeça e pescoço." },
  ]},
  { month: 8, monthName: "Agosto", campaigns: [
    { name: "Agosto Dourado", colorName: "Dourado", description: "Informação sobre aleitamento materno, especialmente na Semana Mundial da Amamentação." },
  ]},
  { month: 9, monthName: "Setembro", campaigns: [
    { name: "Setembro Amarelo", colorName: "Amarelo", description: "Prevenção ao suicídio e promoção da saúde mental." },
    { name: "Setembro Verde", colorName: "Verde", description: "Doação de órgãos e prevenção ao câncer de intestino." },
    { name: "Setembro Vermelho", colorName: "Vermelho", description: "Prevenção de doenças cardiovasculares." },
  ]},
  { month: 10, monthName: "Outubro", campaigns: [
    { name: "Outubro Rosa", colorName: "Rosa", description: "Conscientização sobre o câncer de mama, a campanha mais conhecida mundialmente." },
  ]},
  { month: 11, monthName: "Novembro", campaigns: [
    { name: "Novembro Azul", colorName: "Azul", description: "Combate ao câncer de próstata e conscientização sobre o diabetes." },
    { name: "Novembro Dourado", colorName: "Dourado", description: "Conscientização sobre o câncer infantojuvenil." },
  ]},
  { month: 12, monthName: "Dezembro", campaigns: [
    { name: "Dezembro Vermelho", colorName: "Vermelho", description: "Prevenção contra a AIDS e conscientização sobre o HIV." },
    { name: "Dezembro Laranja", colorName: "Laranja", description: "Combate ao câncer de pele e proteção solar." },
  ]},
];

// Mesmo mapeamento usado em supabase/functions/generate-campaign-banner/index.ts
const CAMPAIGN_BANNER_MAP: Record<number, string> = {
  1: "campaign-banners/campanha-1.png",
  2: "campaign-banners/campanha-2.png",
  3: "campaign-banners/campanha-3.png",
  4: "campaign-banners/campanha-4.png",
  5: "campaign-banners/campanha-5.png",
  6: "campaign-banners/campanha-6.png",
  7: "campaign-banners/campanha-7.png",
  8: "campaign-banners/campanha-8.png",
  9: "campaign-banners/campanha-9.png",
  10: "campaign-banners/campanha-10.png",
  11: "campaign-banners/campanha-11.png",
  12: "campaign-banners/campanha-12.png",
};

const buildWapiUrl = (rawUrl: string, instanceId: string, path: string) => {
  const url = new URL(rawUrl.trim());
  if (url.hostname === "painel.w-api.app" || url.pathname.startsWith("/app")) {
    url.protocol = "https:";
    url.hostname = "api.w-api.app";
  }
  url.pathname = path;
  url.searchParams.set("instanceId", instanceId);
  return url.toString();
};

// Pará UTC-3
const paraDate = () => {
  const now = new Date();
  return new Date(now.getTime() - 3 * 60 * 60 * 1000);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    console.log("Starting wapi-campaign-notify...");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    let force = false;
    try {
      if (req.method === "POST") {
        const body = await req.json().catch(() => ({}));
        console.log("Request body:", JSON.stringify(body));
        force = !!body?.force;
      }
    } catch (e) {
      console.error("Error parsing request body:", e);
    }

    const { data: cfg, error: cfgError } = await admin
      .from("wapi_config")
      .select("*")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cfgError) {
      console.error("Error fetching wapi_config:", cfgError);
      throw cfgError;
    }

    if (!cfg || !cfg.enabled || !cfg.instance_url || !cfg.instance_token || !cfg.instance_id) {
      console.log("W-API not configured or disabled");
      return new Response(JSON.stringify({ skipped: true, reason: "W-API não configurada" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!cfg.auto_send_campaign_alert && !force) {
      console.log("Campaign alert disabled and not forced");
      return new Response(JSON.stringify({ skipped: true, reason: "Alerta de Campanha do Mês desabilitado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const groupId = (cfg.group_id_campaign || cfg.group_id || "").trim();
    if (!groupId) {
      return new Response(JSON.stringify({ skipped: true, reason: "ID do grupo não configurado" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const para = paraDate();
    const day = para.getUTCDate();
    const monthIdx = para.getUTCMonth() + 1; // 1..12
    const year = para.getUTCFullYear();

    if (day !== 1 && !force) {
      return new Response(JSON.stringify({ skipped: true, reason: `Hoje não é dia 1 (Pará: ${day}/${monthIdx})` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const monthData = CAMPAIGN_DATA.find((m) => m.month === monthIdx);
    if (!monthData) {
      return new Response(JSON.stringify({ skipped: true, reason: `Sem campanha cadastrada para o mês ${monthIdx}` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Resolve URL pública do banner do mês
    let imageUrl: string | null = null;
    const bannerPath = CAMPAIGN_BANNER_MAP[monthIdx];
    if (bannerPath) {
      const { data: pub } = admin.storage.from("announcements").getPublicUrl(bannerPath);
      imageUrl = pub?.publicUrl || null;
      // Cache-bust para evitar imagem antiga em cache do W-API
      if (imageUrl) imageUrl = `${imageUrl}?v=${Date.now()}`;
    }

    // Monta caption
    const lines: string[] = [];
    lines.push(`🎗️ *CAMPANHA DO MÊS — ${monthData.monthName.toUpperCase()}/${year}*`);
    lines.push("");
    for (const c of monthData.campaigns) {
      lines.push(`✨ *${c.name}* (${c.colorName})`);
      lines.push(`${c.description}`);
      lines.push("");
    }
    lines.push(`📣 *Vamos abraçar a causa deste mês!*`);
    lines.push(`Compartilhe, conscientize e apoie. Juntos somos mais fortes. 💪`);
    lines.push("");
    lines.push(`_Mensagem automática - Sucena_`);
    const caption = lines.join("\n");

    const delayMessage = Math.max(1, Math.min(15, Number(cfg.delay_seconds ?? 5) || 5));

    let ok = false;
    let errorMsg: string | null = null;
    try {
      const queueRow = imageUrl
        ? { kind: "image", target_type: "group", phone: groupId, message: caption, caption, image_url: imageUrl, origin: "campaign", recipient_name: "Grupo - Campanha do Mês" }
        : { kind: "text",  target_type: "group", phone: groupId, message: caption, origin: "campaign", recipient_name: "Grupo - Campanha do Mês" };
      const { error: qErr } = await admin.from("wapi_outbox").insert(queueRow);
      ok = !qErr;
      if (qErr) errorMsg = qErr.message;
    } catch (e) {
      errorMsg = e instanceof Error ? e.message : "Erro desconhecido";
    }

    return new Response(JSON.stringify({
      success: ok,
      month: monthData.monthName,
      hasImage: !!imageUrl,
      imageUrl,
      campaignCount: monthData.campaigns.length,
      error: errorMsg,
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
