import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { transcript, meetingTitle, participants } = await req.json();

    if (!transcript || typeof transcript !== "string" || transcript.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Transcrição muito curta ou vazia." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = `Você é um assistente que organiza atas de reuniões em português do Brasil.
Receba a transcrição bruta de uma reunião (pode conter erros de ditado, repetições e cortes).
Produza um resumo executivo claro, pontos-chave detalhados e itens de ação (com responsável quando mencionado).
Sempre responda em português do Brasil. Use linguagem profissional e objetiva.`;

    const userPrompt = `Reunião: ${meetingTitle || "Sem título"}
Participantes: ${(Array.isArray(participants) && participants.length > 0) ? participants.join(", ") : "Não informados"}

Transcrição bruta:
"""
${transcript.slice(0, 60000)}
"""

Gere um resumo executivo, pontos-chave e itens de ação.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "save_meeting_summary",
              description: "Salva o resumo estruturado da reunião.",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "Resumo executivo da reunião em 2-4 parágrafos.",
                  },
                  key_points: {
                    type: "array",
                    description: "Lista detalhada dos principais tópicos discutidos.",
                    items: { type: "string" },
                  },
                  action_items: {
                    type: "array",
                    description: "Tarefas/ações decididas, com responsável quando informado.",
                    items: {
                      type: "object",
                      properties: {
                        task: { type: "string" },
                        owner: { type: "string" },
                      },
                      required: ["task"],
                    },
                  },
                },
                required: ["summary", "key_points", "action_items"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "save_meeting_summary" } },
      }),
    });

    if (response.status === 429) {
      return new Response(
        JSON.stringify({ error: "Limite de uso da IA atingido. Tente novamente em instantes." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (response.status === 402) {
      return new Response(
        JSON.stringify({ error: "Créditos da IA esgotados. Adicione créditos no workspace." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    if (!response.ok) {
      const errText = await response.text();
      console.error("AI gateway error:", response.status, errText);
      return new Response(
        JSON.stringify({ error: "Falha ao gerar resumo da reunião." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await response.json();
    const toolCall = data?.choices?.[0]?.message?.tool_calls?.[0];
    let parsed: { summary: string; key_points: string[]; action_items: Array<{ task: string; owner?: string }> } | null = null;

    if (toolCall?.function?.arguments) {
      try {
        parsed = JSON.parse(toolCall.function.arguments);
      } catch (e) {
        console.error("Falha ao parsear tool call:", e);
      }
    }

    if (!parsed) {
      const fallback = data?.choices?.[0]?.message?.content || "";
      parsed = { summary: fallback, key_points: [], action_items: [] };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (e) {
    console.error("summarize-meeting error:", e);
    const message = e instanceof Error ? e.message : "Erro desconhecido";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
