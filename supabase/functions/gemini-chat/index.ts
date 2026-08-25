import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GeminiAPIKey") || Deno.env.get("GEMINI_API_KEY");
    
    if (!GEMINI_API_KEY) {
      throw new Error("A chave GEMINI_API_KEY não está configurada.");
    }

    const { message, history } = await req.json();

    if (!message) {
      throw new Error("Mensagem não fornecida");
    }

    // Prepare contents array with history and new message
    const contents = [];
    
    if (history && Array.isArray(history)) {
      contents.push(...history);
    }
    
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
        systemInstruction: {
          role: "user",
          parts: [
            {
              text: "Você é um assistente virtual inteligente integrado a um painel de controle chamado SucenaPainel. Seja prestativo, claro, e ajude o usuário no que ele precisar. Use formatação markdown sempre que útil (listas, negrito, etc)."
            }
          ]
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(`Erro na API do Gemini: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.candidates || data.candidates.length === 0) {
      throw new Error("A API não retornou nenhuma resposta.");
    }

    const replyText = data.candidates[0].content.parts[0].text;

    return new Response(
      JSON.stringify({ text: replyText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error("Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
