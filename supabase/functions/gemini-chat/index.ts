import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const AI_GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const CHAT_MODEL = "google/gemini-2.5-flash";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Declaração da ferramenta de banco de dados para o Gemini
const toolDeclaration = {
  functionDeclarations: [
    {
      name: "query_database",
      description: "Consulta o banco de dados do Supabase. Use esta ferramenta APENAS quando precisar de informações exatas e em tempo real sobre o painel. Se não souber a estrutura da tabela, faça uma query com limite baixo primeiro.",
      parameters: {
        type: "OBJECT",
        properties: {
          table: {
            type: "STRING",
            description: "Nome da tabela. Ex: equipment, equipment_movements, driver_daily_records, profiles, desvios"
          },
          select: {
            type: "STRING",
            description: "Colunas. Ex: '*' ou '*, equipment(name)'"
          },
          match: {
            type: "OBJECT",
            description: "Filtro de igualdade. Ex: {\"exit_reason\": \"manutencao_corretiva\"}"
          },
          limit: {
            type: "INTEGER",
            description: "Limite de resultados (max 50)"
          }
        },
        required: ["table"]
      }
    }
  ]
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const GEMINI_API_KEY = Deno.env.get("GeminiAPIKey") || Deno.env.get("GEMINI_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      throw new Error("A chave de IA não está configurada.");
    }

    const { message, history, attachedImage } = await req.json();

    if (!message && !attachedImage) {
      throw new Error("Nenhuma mensagem ou imagem foi fornecida.");
    }

    // Image generation bypass
    const isImageCommand = message.toLowerCase().trim().startsWith("/imagem ");
    if (isImageCommand) {
      const originalPrompt = message.substring(8).trim();
      let imagePrompt = originalPrompt;
      try {
        const enhanceUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`;
        const enhanceRes = await fetch(enhanceUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `Translate and enhance to Midjourney-style english prompt, output ONLY prompt: ${originalPrompt}` }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 200 }
          })
        });
        if (enhanceRes.ok) {
          const enhanceData = await enhanceRes.json();
          if (enhanceData.candidates?.[0]?.content?.parts?.[0]?.text) {
            imagePrompt = enhanceData.candidates[0].content.parts[0].text.trim();
          }
        }
      } catch (e) {}
      
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-001:predict?key=${GEMINI_API_KEY}`;
        const response = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instances: [{ prompt: imagePrompt }], parameters: { sampleCount: 1 } })
        });
        if (!response.ok) throw new Error("Imagen API failed");
        const data = await response.json();
        const base64 = data.predictions?.[0]?.bytesBase64;
        if (!base64) throw new Error("No image data");
        return new Response(JSON.stringify({ text: `Aqui está a imagem que você pediu:\n\n![Imagem gerada](data:image/jpeg;base64,${base64})` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      } catch (err) {
        const safePrompt = encodeURIComponent(imagePrompt + " masterpiece, high resolution");
        const fallbackUrl = `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&model=flux&seed=${Math.floor(Math.random()*10000)}`;
        return new Response(JSON.stringify({ text: `Aqui está a imagem que você pediu:\n\n![Imagem gerada](${fallbackUrl})` }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    // Standard Chat with Function Calling
    const contents = [];
    if (history && Array.isArray(history)) {
      contents.push(...history);
    }
    
    const userParts: any[] = [];
    if (message && message.trim().length > 0) userParts.push({ text: message });
    if (attachedImage && attachedImage.base64 && attachedImage.mimeType) {
      userParts.push({ inlineData: { mimeType: attachedImage.mimeType, data: attachedImage.base64 } });
    }
    
    contents.push({ role: "user", parts: userParts });

    const systemInstruction = {
      role: "user",
      parts: [
        {
          text: "Você é um assistente virtual integrado ao painel SucenaPainel. Você consegue ler o banco de dados do sistema em tempo real chamando a ferramenta 'query_database'. Sempre que o usuário perguntar sobre dados operacionais (ex: quem saiu com o equipamento X, quais pipas foram pra manutenção, etc), use a ferramenta para consultar as tabelas (como equipment_movements, equipment, profiles, etc). Na tabela equipment_movements, os motivos de saída geralmente são 'manutencao_corretiva', 'manutencao_preventiva', etc. Se o usuário pedir imagem, oriente-o a usar '/imagem'. Seja amigável e responda em pt-br."
        }
      ]
    };

    // Usaremos a API oficial do Gemini para suportar Function Calling de forma nativa
    if (!GEMINI_API_KEY) {
      throw new Error("Para integração profunda de banco de dados, é necessária a GEMINI_API_KEY do Google.");
    }

    const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    let isFunctionCallDone = false;
    let finalReply = "";
    
    // Inicia cliente do supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Loop de requisição: permite até 2 chamadas sequenciais de função
    let loops = 0;
    while (!isFunctionCallDone && loops < 3) {
      loops++;
      const response = await fetch(geminiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
          systemInstruction,
          tools: [toolDeclaration]
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Erro na API do Gemini: ${errorData.error?.message || response.statusText}`);
      }

      const data = await response.json();
      const firstCandidate = data.candidates?.[0];
      const modelParts = firstCandidate?.content?.parts || [];

      // Check if it requested a function call
      const functionCallPart = modelParts.find((p: any) => p.functionCall);
      
      if (functionCallPart) {
        const fnCall = functionCallPart.functionCall;
        console.log("Gemini pediu para rodar ferramenta:", fnCall.name, fnCall.args);
        
        // Add the model's request to our history
        contents.push({
          role: "model",
          parts: [{ functionCall: fnCall }]
        });

        // Execute DB Query
        let dbResult = {};
        if (fnCall.name === "query_database") {
          try {
            const table = fnCall.args.table;
            const select = fnCall.args.select || '*';
            const limit = Math.min(fnCall.args.limit || 15, 50); // limit max 50
            const match = fnCall.args.match || {};
            
            let query = supabase.from(table).select(select);
            
            // apply equality matches
            if (match && typeof match === 'object') {
              for (const [k, v] of Object.entries(match)) {
                query = query.eq(k, v);
              }
            }
            
            // Ordem decrescente de ID se não especificado nada mais
            const { data: qData, error: qError } = await query.limit(limit).order('id', { ascending: false });
            
            if (qError) throw qError;
            dbResult = { success: true, data: qData, count: qData?.length };
          } catch (err: any) {
            dbResult = { success: false, error: err.message };
          }
        } else {
          dbResult = { success: false, error: "Função desconhecida." };
        }

        // Add the tool response back to history and loop again
        contents.push({
          role: "user",
          parts: [{
            functionResponse: {
              name: fnCall.name,
              response: { result: dbResult }
            }
          }]
        });
        
      } else {
        // No function call, we have the final text response
        const textPart = modelParts.find((p: any) => p.text);
        finalReply = textPart?.text || "Não consegui processar essa informação.";
        isFunctionCallDone = true;
      }
    }

    if (!finalReply && loops >= 3) {
      finalReply = "Desculpe, o sistema tentou buscar muitas informações e atingiu o limite de consultas consecutivas.";
    }

    return new Response(
      JSON.stringify({ text: finalReply }),
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
