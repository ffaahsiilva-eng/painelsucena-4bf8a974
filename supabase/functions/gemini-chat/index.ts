import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CHAT_MODEL = "google/gemini-2.5-flash";

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
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      throw new Error("A chave de IA não está configurada.");
    }

    const { message, history } = await req.json();

    if (!message) {
      throw new Error("Mensagem não fornecida");
    }

    // Check if it's an image generation command
    const isImageCommand = message.toLowerCase().trim().startsWith("/imagem ");
    
    if (isImageCommand) {
      const imagePrompt = message.substring(8).trim();
      
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            instances: [{ prompt: imagePrompt }],
            parameters: { sampleCount: 1 }
          })
        });

        if (!response.ok) {
          throw new Error("Imagen 3 API failed or not allowed on this tier");
        }

        const data = await response.json();
        const base64 = data.predictions?.[0]?.bytesBase64;
        
        if (!base64) {
          throw new Error("No image data returned from API");
        }

        // Return base64 markdown
        return new Response(
          JSON.stringify({ text: `Aqui está a imagem que você pediu:\n\n![Imagem gerada](data:image/jpeg;base64,${base64})` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      } catch (err) {
        console.log("Fallback para Pollinations.ai devido a erro no Imagen 3:", err instanceof Error ? err.message : err);
        // Fallback for when Imagen API is not enabled for the free tier key
        const safePrompt = encodeURIComponent(imagePrompt);
        const fallbackUrl = `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&seed=${Math.floor(Math.random()*1000)}`;
        return new Response(
          JSON.stringify({ text: `Aqui está a imagem que você pediu:\n\n![Imagem gerada](${fallbackUrl})` }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
    }

    // Prepare contents array with history and new message for standard text model
    const contents = [];
    
    if (history && Array.isArray(history)) {
      contents.push(...history);
    }
    
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    const gatewayMessages = [
      {
        role: "system",
        content: "Você é um assistente virtual inteligente integrado a um painel de controle chamado SucenaPainel. Você sabe que o usuário pode gerar imagens se digitar /imagem seguido da descrição. Se ele pedir uma imagem sem o /imagem, avise-o amigavelmente para digitar /imagem seguido do que ele quer desenhar. Use formatação markdown sempre que útil.",
      },
      ...contents.map((item) => ({
        role: item.role === "model" ? "assistant" : "user",
        content: item.parts?.map((part: { text?: string }) => part.text).filter(Boolean).join("\n") || "",
      })),
    ];
    
    const response = LOVABLE_API_KEY
      ? await fetch(AI_GATEWAY_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: CHAT_MODEL,
            messages: gatewayMessages,
            temperature: 0.7,
            max_tokens: 2048,
          }),
        })
      : await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
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
              text: "Você é um assistente virtual inteligente integrado a um painel de controle chamado SucenaPainel. Você sabe que o usuário pode gerar imagens se digitar /imagem seguido da descrição. Se ele pedir uma imagem sem o /imagem, avise-o amigavelmente para digitar /imagem seguido do que ele quer desenhar. Use formatação markdown sempre que útil."
            }
          ]
        }
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Gemini API Error:", errorData);
      throw new Error(`Erro na API de IA: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();

    const replyText = LOVABLE_API_KEY
      ? data.choices?.[0]?.message?.content
      : data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!replyText) {
      throw new Error("A API não retornou nenhuma resposta.");
    }

    return new Response(
      JSON.stringify({ text: replyText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (error) {
    console.error("Erro na Edge Function:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro desconhecido" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );
  }
});
