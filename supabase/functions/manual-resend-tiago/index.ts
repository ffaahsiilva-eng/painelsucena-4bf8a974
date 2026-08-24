import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { pngBase64 } = await req.json();
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);

    const bytes = Uint8Array.from(atob(pngBase64), c => c.charCodeAt(0));
    const path = `epi-cards/manual-tiago-${Date.now()}.png`;

    const { error: upErr } = await sb.storage.from("site-assets").upload(path, bytes, {
      contentType: "image/png", upsert: true,
    });
    if (upErr) throw upErr;

    const imageUrl = `${url}/storage/v1/object/public/site-assets/${path}`;

    const caption = `🦺 *TROCA DE EPI*

👤 *Funcionário:* TIAGO AUGUSTO ROSA MACHADO
🪪 *Matrícula:* 68991
💼 *Função:* TÉCNICO DE MEIO AMBIENTE
📅 *Data:* 29/04/2026
⚠️ *Motivo:* Danificada (rasgada)
✅ *Autorizado por:* ITAMAR DE SOUZA PEREIRA JUNIOR

📦 *Itens entregues:*
• LUVA TÁTIL — Qtd: 1

_Sucena Empreendimentos_`;

    const { data: ins, error: insErr } = await sb.from("wapi_outbox").insert({
      kind: "image",
      target_type: "group",
      phone: "120363406691114696@g.us",
      image_url: imageUrl,
      caption,
      status: "pending",
      origin: "manual_resend",
      scheduled_at: new Date().toISOString(),
    }).select().single();
    if (insErr) throw insErr;

    const w = await fetch(`${url}/functions/v1/wapi-queue-worker`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: "{}",
    });
    const wt = await w.text();

    return new Response(JSON.stringify({ ok: true, id: ins.id, imageUrl, worker: wt }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
