import React, { useState, useRef, useEffect } from "react";
import { Sparkles, Send, UserRound, Loader2, RefreshCw, Paperclip, X, Download, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";
import { resolveStorageUrl } from "@/lib/storage";

type Message = {
  id: string;
  role: "user" | "model";
  text: string;
  isStreaming?: boolean;
};

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

interface ChatInterfaceProps {
  onClose?: () => void;
}

export const ChatInterface = ({ onClose }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);
  const [userAvatarUrl, setUserAvatarUrl] = useState<string | null>(null);
  const [isHistoryLoaded, setIsHistoryLoaded] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (data.user) {
        setUserId(data.user.id);
        
        // Fetch user avatar and name
        const { data: profile } = await supabase
          .from("profiles")
          .select("avatar_url, full_name")
          .eq("user_id", data.user.id)
          .maybeSingle();
          
        let currentUserName = null;
        if (profile?.full_name) {
          currentUserName = profile.full_name.split(' ')[0];
          setUserName(currentUserName);
        }
          
        if (profile?.avatar_url) {
          const resolved = await resolveStorageUrl(profile.avatar_url);
          setUserAvatarUrl(resolved);
        }

        const defaultMsgText = currentUserName ? `Olá, ${currentUserName}! Sou a Inteligência Artificial do painel.\nComo posso ajudar você hoje?` : "Olá! Sou a Inteligência Artificial do painel.\nComo posso ajudar você hoje?";
        const defaultMsg = [{ id: "1", role: "model" as const, text: defaultMsgText }];

        const saved = localStorage.getItem(`sucena_ai_history_${data.user.id}`);
        if (saved) {
          try {
            setMessages(JSON.parse(saved));
          } catch(e) {
            setMessages(defaultMsg);
          }
        } else {
          setMessages(defaultMsg);
        }
      } else {
        const defaultMsg = [{ id: "1", role: "model" as const, text: "Olá! Sou a Inteligência Artificial do painel.\nComo posso ajudar você hoje?" }];
        setMessages(defaultMsg);
      }
      setIsHistoryLoaded(true);
    });
  }, []);

  useEffect(() => {
    if (isHistoryLoaded && userId && messages.length > 0) {
      localStorage.setItem(`sucena_ai_history_${userId}`, JSON.stringify(messages));
    }
  }, [messages, userId, isHistoryLoaded]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  };

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessageText = input.trim();
    const userMessage: Message = { id: Date.now().toString(), role: "user", text: userMessageText };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMessageId, role: "model", text: "", isStreaming: true }]);

    const currentAttachedImage = attachedImage;
    setAttachedImage(null);

    try {
      const b64Key = import.meta.env.VITE_GEMINI_KEY_B64;
      const GEMINI_API_KEY = b64Key ? atob(b64Key) : import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        throw new Error("A chave de API do Gemini (VITE_GEMINI_KEY_B64 ou VITE_GEMINI_API_KEY) não está configurada.");
      }

      // Check if it's an image command
      const isImageCommand = userMessageText.toLowerCase().trim().startsWith("/imagem ");
      if (isImageCommand) {
        const imagePrompt = userMessageText.substring(8).trim();
        let englishPrompt = imagePrompt;
        
        try {
          const transPayload = {
            contents: [{ role: "user", parts: [{ text: `Translate the following image generation prompt to English. Make it highly descriptive and optimize it for an AI image generator. DO NOT include any conversational text, just the final English prompt:\n\n${imagePrompt}` }] }]
          };
          for (const model of ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-flash-latest"]) {
            const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
            const res = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(transPayload),
            });
            if (res.ok) {
              const tData = await res.json();
              if (tData.candidates?.[0]?.content?.parts?.[0]?.text) {
                englishPrompt = tData.candidates[0].content.parts[0].text.trim();
                break;
              }
            }
          }
        } catch (e) {
          console.error("Erro ao traduzir prompt de imagem", e);
        }

        let imageUrl = "";
        const openaiKey = import.meta.env.VITE_OPENAI_API_KEY;

        if (openaiKey) {
          try {
            const res = await fetch("https://api.openai.com/v1/images/generations", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${openaiKey}`
              },
              body: JSON.stringify({
                model: "dall-e-3",
                prompt: englishPrompt,
                n: 1,
                size: "1024x1024"
              })
            });
            if (res.ok) {
              const data = await res.json();
              imageUrl = data.data[0].url;
            }
          } catch (e) {
            console.error("Erro no DALL-E da OpenAI:", e);
          }
        }

        if (!imageUrl) {
          const safePrompt = encodeURIComponent(englishPrompt + ", masterpiece, high resolution, best quality");
          imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&model=flux&seed=${Math.floor(Math.random()*10000)}`;
        }
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === aiMessageId 
              ? { ...msg, text: `Aqui está a imagem que você pediu:\n\n![Imagem gerada](${imageUrl})`, isStreaming: false } 
              : msg
          )
        );
        setIsLoading(false);
        return;
      }



      // Assemble history correctly for Gemini API
      const contents: any[] = [];
      const history = messages.slice(-10); // get last 10 messages for context
      
      history.forEach(m => {
        if (m.text && m.text !== "" && m.role) {
           contents.push({ role: m.role, parts: [{ text: m.text }] });
        }
      });

      const userParts: any[] = [{ text: userMessageText }];
      if (currentAttachedImage) {
        userParts.push({ inlineData: { mimeType: currentAttachedImage.mimeType, data: currentAttachedImage.base64 } });
      }
      contents.push({ role: "user", parts: userParts });

      const systemInstruction = {
        role: "user",
        parts: [
          {
            text: `Você é um assistente virtual integrado ao painel SucenaPainel. Você está conversando neste momento com o usuário logado no sistema: ${userName || 'Usuário'}. Chame-o pelo nome e seja prestativo.\n\nINFORMAÇÃO TEMPORAL IMPORTANTE:\nHoje é ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} (Formato ISO: ${new Date().toISOString().split('T')[0]}). Sempre use esta data atual como referência absoluta para calcular "ontem", "hoje", "amanhã", "segunda-feira passada", etc.\n\nVocê possui duas funções principais:\n1. Responder dúvidas e consultar informações reais do banco de dados do painel chamando a ferramenta 'query_database'.\n2. Ajudar de forma geral como uma IA avançada em qualquer outro assunto ou dúvida que o usuário tiver fora do sistema.\n\nDICA DE OURO: Você TEM PERMISSÃO TOTAL para acessar TODAS as tabelas do sistema, como: desvios, equipment, rh_efetivo, planejamento_metas, reuniões, vistorias, dds_schedule, instacena_posts, etc. Se o usuário pedir informações sobre "desvios", você DEVE chamar a ferramenta 'query_database' na tabela "desvios". Jamais diga que não tem permissão para acessar algo do painel, apenas busque.\n\nPara evitar bloqueios de limite de cota, NUNCA faça queries para descobrir as colunas. Use as seguintes estruturas conhecidas:\n- Tabela \`desvios\`: id, description, status (ex: Aberto, Concluído, Em Andamento), priority, due_date, created_by_name, responsible_name, tags, instruction, correction, environment\n- Tabela \`equipment\`: id, name, type, equipment_type, status, plate, brand, environment\n- Tabela \`equipment_movements\`: id, equipment_name, exit_reason, environment, created_at, created_by\n- Tabela \`profiles\`: id, full_name, cargo, environment\n- Tabela \`rh_efetivo\`: id, colaboradores (coluna JSONB contendo array de funcionários com nome, aso, funcao), environment\n- Tabela \`dds_schedule\` (buscar SEMPRE usando select="*, profiles(full_name)"): id, scheduled_date, theme, external_presenter_name, presenter_user_id. ATENÇÃO: Para saber quem é o Apresentador, se \`external_presenter_name\` estiver vazio, o nome correto estará dentro do objeto \`profiles.full_name\`. Se ambos existirem, dê preferência ao \`profiles.full_name\`.\n- Tabela \`instacena_posts\` (feed de fotos, rede social interna Instacena, DDS mensal ou o que foi postado no dia): id, content, created_at, user_name, environment, image_urls\n\nATENÇÃO MÁXIMA 1: Tente fazer buscas amplas (ex: não filtre tanto no \`match\`, traga mais resultados e filtre você mesmo). Faça APENAS UMA chamada de função por vez. Se a consulta retornar vazia ([]), NÃO tente fazer outra busca na mesma hora, apenas responda 'Não encontrei dados'. NUNCA faça consultas em loop.\nATENÇÃO MÁXIMA 2: Você TEM PERMISSÃO TOTAL para acessar e informar qualquer dado do RH, Desvios ou Equipamentos. Apenas negue acesso e peça para contatar o administrador caso seja estritamente um dado financeiro ou senha de acesso.\n\nREGRAS DE FORMATAÇÃO E EXIBIÇÃO:\n1. NUNCA use tabelas em Markdown (ex: \`| Coluna |\`) nas suas respostas, pois elas quebram a interface do chat. Formate as informações em texto corrido estruturado com quebras de linha, bullet points e emojis.\n2. Se a consulta retornar APENAS um UUID de usuário sem o nome, NUNCA mostre o UUID bruto para o usuário. Faça uma nova consulta na tabela \`profiles\` para obter o nome real da pessoa, ou omita o ID, mas mostre apenas o PRIMEIRO NOME dela se encontrar. Se você já fez o join (ex: profiles(full_name)), pegue o nome de lá.\n3. Se você for enviar um link de imagem ou foto da tabela, NUNCA envie usando a sintaxe de imagem do markdown \`![foto](url)\`. Em vez disso, envie como um link de texto simples: \`[Visualizar Imagem](url)\`.\n\nCALENDÁRIO HYDRO 2026 (Use isso se perguntarem sobre feriados ou calendário):\n- Jan: 01 (Confraternização)\n- Fev: 16-17 (Carnaval), 18 (Cinzas - Compensado)\n- Abr: 03 (Paixão), 20 (Compensado), 21 (Tiradentes)\n- Mai: 01 (Trabalhador)\n- Jun: 04 (Corpus Christi), 05 (Compensado)\n- Set: 07 (Independência)\n- Out: 12 (N. Sra. Aparecida)\n- Nov: 02 (Finados), 15 (República), 20 (Consciência Negra)\n- Dez: 03 (São Francisco Xavier), 04 (Compensado), 25 (Natal)\n\nSeja amigável, criativo ao ajudar com assuntos gerais e sempre responda em pt-br.`
          }
        ]
      };

      let isFunctionCallDone = false;
      let finalReply = "";
      let loops = 0;
      
      const modelsToTry = ["gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "openai/gpt-oss-120b", "openai/gpt-oss-20b"];

      const fetchWithFallback = async (payload: any) => {
        let lastError = null;
        for (const model of modelsToTry) {
          try {
            if (!model.startsWith("gemini")) {
              let apiKey = "";
              let endpoint = "";
              
              if (model.startsWith("gpt-4")) {
                apiKey = import.meta.env.VITE_OPENAI_API_KEY;
                endpoint = "https://api.openai.com/v1/chat/completions";
              } else {
                apiKey = import.meta.env.VITE_GROQ_API_KEY;
                endpoint = "https://api.groq.com/openai/v1/chat/completions";
              }

              if (!apiKey) {
                console.warn(`API key not found, skipping ${model}`);
                continue;
              }

              // Translate Gemini payload to OpenAI (Groq) format
              const messages = [];
              if (payload.systemInstruction?.parts?.[0]?.text) {
                messages.push({ role: "system", content: payload.systemInstruction.parts[0].text });
              }

              for (const item of payload.contents) {
                const role = item.role === "model" ? "assistant" : "user";
                let text = "";
                let tool_calls = undefined;
                
                // If it's a tool response from user
                if (item.role === "user" && item.parts[0]?.functionResponse) {
                  messages.push({
                    role: "tool",
                    tool_call_id: "call_default", // Dummy ID since Gemini doesn't track them
                    name: item.parts[0].functionResponse.name,
                    content: JSON.stringify(item.parts[0].functionResponse.response)
                  });
                  continue;
                }

                // If it's a tool call from model
                if (item.role === "model" && item.parts[0]?.functionCall) {
                  messages.push({
                    role: "assistant",
                    content: null,
                    tool_calls: [{
                      id: "call_default",
                      type: "function",
                      function: {
                        name: item.parts[0].functionCall.name,
                        arguments: JSON.stringify(item.parts[0].functionCall.args)
                      }
                    }]
                  });
                  continue;
                }

                for (const part of item.parts) {
                  if (part.text) text += part.text;
                }
                if (text) messages.push({ role, content: text });
              }

              let paramsStr = JSON.stringify(payload.tools[0].functionDeclarations[0].parameters);
              paramsStr = paramsStr.replace(/"type":\s*"OBJECT"/g, '"type":"object"');
              paramsStr = paramsStr.replace(/"type":\s*"STRING"/g, '"type":"string"');
              paramsStr = paramsStr.replace(/"type":\s*"INTEGER"/g, '"type":"integer"');
              paramsStr = paramsStr.replace(/"type":\s*"NUMBER"/g, '"type":"number"');
              paramsStr = paramsStr.replace(/"type":\s*"BOOLEAN"/g, '"type":"boolean"');
              paramsStr = paramsStr.replace(/"type":\s*"ARRAY"/g, '"type":"array"');

              const groqPayload = {
                model: model,
                messages: messages,
                temperature: payload.generationConfig?.temperature || 0.2,
                max_tokens: payload.generationConfig?.maxOutputTokens || 2048,
                tools: [{
                  type: "function",
                  function: {
                    name: "query_database",
                    description: "Consulta o banco de dados do Supabase. Use esta ferramenta APENAS quando precisar de informações exatas e em tempo real sobre o painel.",
                    parameters: JSON.parse(paramsStr)
                  }
                }],
                tool_choice: "auto"
              };

              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(groqPayload),
              });

              if (response.ok) {
                const groqData = await response.json();
                const choice = groqData.choices?.[0]?.message;
                
                // Translate back to Gemini format
                const parts = [];
                if (choice?.tool_calls && choice.tool_calls.length > 0) {
                  const fnCall = choice.tool_calls[0].function;
                  parts.push({
                    functionCall: {
                      name: fnCall.name,
                      args: JSON.parse(fnCall.arguments || "{}")
                    }
                  });
                } else if (choice?.content) {
                  parts.push({ text: choice.content });
                }

                return {
                  candidates: [{
                    content: { parts }
                  }]
                };
              } else {
                const err = await response.json().catch(() => ({}));
                if (response.status === 429 || response.status === 503) {
                  lastError = err;
                  await new Promise(r => setTimeout(r, 1000));
                  continue;
                }
                throw new Error(err.error?.message || "Groq Error");
              }
            } else {
              // GEMINI LOGIC
              const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
              const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
              });
              
              if (response.ok) {
                return await response.json();
              }
              
              if (response.status === 503 || response.status === 429 || response.status === 404 || response.status === 400) {
                console.warn(`Modelo ${model} retornou ${response.status}. Tentando fallback...`);
                lastError = await response.json().catch(() => ({}));
                await new Promise(r => setTimeout(r, 1000));
                continue;
              }
              
              const errorData = await response.json().catch(() => ({}));
              throw new Error(`Erro na API do Gemini (${model}): ${errorData.error?.message || response.statusText}`);
            }
          } catch (loopErr: any) {
            console.error("Error in fallback loop for", model, loopErr);
            lastError = loopErr;
          }
        }
        throw new Error(`Sistema indisponível no momento. (Detalhe: ${lastError?.error?.message || lastError?.message || ''})`);
      };

      // Limitado a 5 loops para não estourar a cota mas permitir queries extras
      while (!isFunctionCallDone && loops < 5) {
        loops++;
        const data = await fetchWithFallback({
          contents,
          generationConfig: { temperature: 0.2, maxOutputTokens: 2048 },
          systemInstruction,
          tools: [toolDeclaration]
        });

        const firstCandidate = data.candidates?.[0];
        const modelParts = firstCandidate?.content?.parts || [];

        // Verifica se a IA pediu para rodar uma ferramenta
        const functionCallPart = modelParts.find((p: any) => p.functionCall);
        
        if (functionCallPart) {
          const fnCall = functionCallPart.functionCall;
          console.log("Gemini pediu para rodar ferramenta via Frontend:", fnCall.name, fnCall.args);
          
          // Adiciona a resposta de chamada de função da IA no histórico temporário
          contents.push({
            role: "model",
            parts: modelParts
          });

          // Executa a busca no banco via Frontend (usando RLS)
          let dbResult = {};
          if (fnCall.name === "query_database") {
            try {
              const table = fnCall.args.table;
              const select = fnCall.args.select || '*';
              const limit = Math.min(fnCall.args.limit || 30, 100); // limit max 100
              const match = fnCall.args.match || {};
              
              let query = supabase.from(table).select(select);
              
              if (match && typeof match === 'object') {
                for (const [k, v] of Object.entries(match)) {
                  if (typeof v === 'string') {
                    const isDate = /^\d{4}-\d{2}-\d{2}(T.*)?$/.test(v);
                    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);
                    if (isDate || isUUID || k === 'status' || k === 'environment' || k.includes('date') || k.includes('id')) {
                      query = query.eq(k, v);
                    } else {
                      query = query.ilike(k, `%${v}%`);
                    }
                  } else {
                    query = query.eq(k, v);
                  }
                }
              }
              
              const { data: qData, error: qError } = await query.limit(limit).order('id', { ascending: false });
              
              if (qError) throw qError;
              
              let cleanData = qData;
              if (Array.isArray(qData)) {
                cleanData = qData.map((item: any) => {
                  const { user_avatar_url, user_avatar, ...rest } = item;
                  
                  // Try to resolve any photo or image field to a full public URL
                  // The bucket is 'desvios' for the desvios table, otherwise usually 'site-assets'
                  const bucketName = table === 'desvios' ? 'desvios' : 'site-assets';

                  for (const key of Object.keys(rest)) {
                    const val = rest[key];
                    if (val && typeof val === 'string' && (key.includes('photo') || key.includes('image') || key.includes('url'))) {
                      if (!val.startsWith('http')) {
                        const { data: pubData } = supabase.storage.from(bucketName).getPublicUrl(val);
                        if (pubData && pubData.publicUrl) {
                          rest[key] = pubData.publicUrl;
                        }
                      }
                    } else if (val && Array.isArray(val) && (key.includes('image') || key.includes('photo'))) {
                      rest[key] = val.map((v: any) => {
                        if (typeof v === 'string' && !v.startsWith('http')) {
                          return supabase.storage.from(bucketName).getPublicUrl(v).data.publicUrl;
                        }
                        return v;
                      });
                    }
                  }
                  
                  return rest;
                });
              }
              let dataStr = JSON.stringify(cleanData);
              if (dataStr.length > 5000) {
                console.warn("Payload very large, truncating to 5000 chars to save tokens...");
                dataStr = dataStr.substring(0, 5000) + '... [TRUNCATED]';
              }
              
              dbResult = { success: true, data: dataStr, count: qData?.length };
            } catch (err: any) {
              console.error("Erro na busca do banco:", err);
              dbResult = { success: false, error: err.message };
            }
          } else {
            dbResult = { success: false, error: "Função desconhecida." };
          }

          // Devolve o resultado pro Gemini e deixa o loop rodar de novo
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
          // Nenhuma ferramenta solicitada, significa que a IA retornou a resposta final em texto
          const textPart = modelParts.find((p: any) => p.text);
          finalReply = textPart?.text || "Não consegui processar essa informação.";
          isFunctionCallDone = true;
        }
      }

      if (!finalReply) {
        finalReply = "Desculpe, precisei de muito tempo para analisar os dados ou ocorreu uma falha de conexão com a IA. Pode tentar perguntar novamente de outra forma?";
      }



      // Atualiza a interface com a resposta final
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId 
            ? { ...msg, text: finalReply, isStreaming: false } 
            : msg
        )
      );

    } catch (error: any) {
      console.error("Erro no chat:", error);
      let errorMessage = error.message || "Verifique se você inseriu a VITE_GEMINI_API_KEY corretamente.";
      let toastMessage = "Erro ao comunicar com a IA. " + (error.message || "Tente novamente.");
      
      const errStr = errorMessage.toLowerCase();
      if (errStr.includes("quota") || errStr.includes("429") || errStr.includes("too many requests") || errStr.includes("overloaded")) {
        errorMessage = "Opa! Estou recebendo muitas solicitações no momento e meu limite gratuito foi atingido. Por favor, aguarde um minutinho e tente novamente! ⏳";
        toastMessage = "Limite de respostas atingido. Aguarde um instante.";
      }

      toast.error(toastMessage);
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId 
            ? { ...msg, text: errorMessage, isStreaming: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      const base64 = result.split(',')[1];
      setAttachedImage({
        url: result,
        base64,
        mimeType: file.type
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    const defaultText = userName ? `Histórico limpo. Como posso ajudar, ${userName}?` : "Histórico limpo. Como posso ajudar?";
    setMessages([{ id: Date.now().toString(), role: "model", text: defaultText }]);
  };

  return (
    <div className="fluent-chat-root">
      {/* ── Header ── */}
      <div className="fluent-chat-header">
        <button onClick={clearChat} className="fluent-clear-btn">
          <RefreshCw className="fluent-clear-icon" />
          <span>Limpar conversa</span>
        </button>
        {onClose && (
          <button onClick={onClose} className="fluent-close-btn" aria-label="Fechar chat">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* ── Logo IA Sucena ── */}
      <div className="fluent-chat-logo-area">
        <img src="/logo-ia-sucena.png" alt="IA Sucena" className="fluent-logo-image" />
      </div>

      {/* ── Messages area ── */}
      <div className="fluent-chat-messages" ref={scrollRef}>
        <div className="fluent-messages-inner">
          {messages.map((message, idx) => (
            <div
              key={message.id}
              className={cn(
                "fluent-msg-row",
                message.role === "user" ? "fluent-msg-user" : "fluent-msg-ai"
              )}
              style={{ animationDelay: `${Math.min(idx * 40, 200)}ms` }}
            >
              {message.role === "model" && (
                <div className="w-11 h-11 min-w-[44px] flex items-center justify-center flex-shrink-0 mt-1">
                  <img src="/robot-ia.png?v=4" alt="IA" className="w-full h-full object-contain drop-shadow-sm scale-[1.15]" />
                </div>
              )}

              <div
                className={cn(
                  "fluent-msg-bubble",
                  message.role === "user" ? "fluent-bubble-user" : "fluent-bubble-ai"
                )}
              >
                {message.isStreaming && !message.text ? (
                  <div className="fluent-typing">
                    <span className="fluent-dot" style={{ animationDelay: '0ms' }} />
                    <span className="fluent-dot" style={{ animationDelay: '160ms' }} />
                    <span className="fluent-dot" style={{ animationDelay: '320ms' }} />
                  </div>
                ) : (
                  <div className="fluent-msg-text">
                    <ReactMarkdown
                      components={{
                        img: ({ node, ...props }) => {
                          const handleDownload = () => {
                            if (props.src) {
                              const a = document.createElement('a');
                              a.href = props.src;
                              a.download = `imagem-gemini-${Date.now()}.png`;
                              document.body.appendChild(a);
                              a.click();
                              document.body.removeChild(a);
                            }
                          };
                          return (
                            <div className="relative group mt-2 inline-block">
                              <img {...props} className="rounded-xl w-full max-w-md shadow-md" alt={props.alt || 'Imagem'} />
                              <button
                                onClick={handleDownload}
                                className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Baixar imagem"
                              >
                                <Download className="w-4 h-4" />
                              </button>
                            </div>
                          );
                        }
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                    {(() => {
                      const ts = parseInt(message.id);
                      if (!isNaN(ts) && ts > 1600000000000) {
                        return (
                          <div className="text-[10px] opacity-40 text-right mt-1.5 w-full leading-none">
                            {new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        );
                      }
                      return null;
                    })()}
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="fluent-user-avatar overflow-hidden">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="Você" className="w-full h-full object-cover" />
                  ) : (
                    <UserRound className="w-5 h-5 text-white" />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Input area ── */}
      <div className="fluent-chat-input-area">
        {/* Attached image preview */}
        {attachedImage && (
          <div className="fluent-attach-preview">
            <img src={attachedImage.url} alt="Anexo" className="fluent-attach-img" />
            <button
              onClick={() => setAttachedImage(null)}
              className="fluent-attach-remove"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        <div className="fluent-input-capsule">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileChange}
          />
          <button
            type="button"
            className="fluent-paperclip-btn"
            onClick={() => fileInputRef.current?.click()}
            disabled={isLoading}
            title="Anexar imagem"
          >
            <Paperclip className="w-5 h-5 text-blue-500" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte algo à IA Sucena..."
            className="fluent-textarea"
            rows={1}
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={(!input.trim() && !attachedImage) || isLoading}
            className="fluent-send-btn"
            title="Enviar mensagem"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </div>
        <p className="fluent-disclaimer">
          A IA pode cometer erros. Verifique informações importantes.
        </p>
      </div>

      {/* ── Scoped Fluent Design styles ── */}
      <style>{`
        /* ═══════════════════════════════════════════
           Windows 11 Fluent Design — Chat Panel IA Sucena
           ═══════════════════════════════════════════ */

        .fluent-chat-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
          background: rgba(246, 250, 255, 0.88);
          backdrop-filter: blur(20px) saturate(140%);
          -webkit-backdrop-filter: blur(20px) saturate(140%);
          border: 1px solid rgba(255, 255, 255, 0.75);
          border-radius: 30px;
          box-shadow:
            0 20px 60px rgba(20,55,100,0.18),
            0 4px 15px rgba(50,130,255,0.08);
          overflow: hidden;
          color: #17345F;
          animation: fluentOpen .3s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fluentOpen {
          from {
            opacity: 0;
            transform: translateY(12px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        /* ── Header ── */
        .fluent-chat-header {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 12px;
          height: 50px;
          padding: 0 20px;
          flex-shrink: 0;
          border-bottom: 1px solid rgba(255,255,255,0.8);
        }

        .fluent-clear-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          border: none;
          background: transparent;
          color: #17345F;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          border-radius: 12px;
          transition: all .2s ease;
        }

        .fluent-clear-btn:hover {
          background: rgba(49, 135, 245, 0.08);
          color: #3187F5;
        }

        .fluent-clear-icon {
          width: 16px;
          height: 16px;
          transition: transform .3s ease;
        }

        .fluent-clear-btn:hover .fluent-clear-icon {
          transform: rotate(-90deg);
        }

        .fluent-close-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border: none;
          background: #ef4444; /* Solid vibrant red */
          color: #ffffff; /* White text for contrast */
          cursor: pointer;
          border-radius: 12px;
          transition: all .2s ease;
        }

        .fluent-close-btn:hover {
          background: #dc2626; /* Darker solid red on hover */
          color: #ffffff;
        }

        /* ── Logo IA Sucena ── */
        .fluent-chat-logo-area {
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 12px 0 16px 0;
          flex-shrink: 0;
        }

        .fluent-logo-image {
          height: 48px;
          width: auto;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.08));
        }

        /* ── Messages scrollable area ── */
        .fluent-chat-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 24px 24px;
          scroll-behavior: smooth;
        }

        .fluent-chat-messages::-webkit-scrollbar {
          width: 6px;
        }
        
        .fluent-chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }
        
        .fluent-chat-messages::-webkit-scrollbar-thumb {
          background: rgba(116, 136, 164, 0.25);
          border-radius: 10px;
        }

        .fluent-chat-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(116, 136, 164, 0.45);
        }

        .fluent-messages-inner {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        /* ── Message row ── */
        .fluent-msg-row {
          display: flex;
          gap: 16px;
          align-items: flex-end;
          animation: fluentMsgFadeSlide .3s cubic-bezier(0.16, 1, 0.3, 1) both;
        }

        .fluent-msg-user {
          justify-content: flex-end;
        }

        .fluent-msg-ai {
          justify-content: flex-start;
          align-items: flex-start;
        }

        @keyframes fluentMsgFadeSlide {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ── AI Avatar ── */
        .fluent-ai-avatar {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 50%;
          background: #ffffff;
          border: 1px solid rgba(77, 168, 255, 0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(49, 135, 245, 0.1);
          flex-shrink: 0;
          margin-top: 4px;
        }

        .fluent-ai-avatar-icon {
          width: 20px;
          height: 20px;
          color: #3187F5;
        }

        /* ── User Avatar ── */
        .fluent-user-avatar {
          width: 44px;
          height: 44px;
          min-width: 44px;
          border-radius: 50%;
          background: #3187F5;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
          box-shadow: 0 4px 12px rgba(49, 135, 245, 0.2);
        }

        /* ── Message Bubbles ── */
        .fluent-msg-bubble {
          max-width: 78%;
          word-break: break-word;
        }

        .fluent-bubble-ai {
          padding: 6px 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, rgba(255,255,255,0.96), rgba(242,247,253,0.96));
          border: 1px solid rgba(255,255,255,0.9);
          box-shadow: 0 4px 10px rgba(35,65,100,0.05);
        }

        .fluent-bubble-user {
          padding: 6px 12px;
          border-radius: 12px;
          background: linear-gradient(135deg, #4DA8FF 0%, #3187F5 100%);
          color: white !important;
          box-shadow: 0 4px 10px rgba(45,135,245,0.12);
        }

        .fluent-bubble-user .fluent-msg-text,
        .fluent-bubble-user .fluent-msg-text * {
          color: white !important;
        }

        /* ── Message Text ── */
        .fluent-msg-text {
          font-size: 14px;
          line-height: 1.4;
          color: #17345F;
        }

        .fluent-msg-text p {
          margin: 0 0 4px;
        }

        .fluent-msg-text p:last-child {
          margin-bottom: 0;
        }

        .fluent-msg-text strong {
          font-weight: 700;
        }

        .fluent-msg-text code {
          background: rgba(78,166,255,.08);
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 14px;
        }

        .fluent-msg-text pre {
          background: rgba(23,52,95,.04);
          padding: 14px;
          border-radius: 14px;
          overflow-x: auto;
          margin: 12px 0;
          font-size: 14px;
        }

        .fluent-msg-text ul, .fluent-msg-text ol {
          padding-left: 20px;
          margin: 10px 0;
        }

        .fluent-msg-text li {
          margin-bottom: 6px;
        }

        .fluent-msg-text a {
          color: #4DA8FF;
          text-decoration: underline;
        }

        /* ── Typing indicator ── */
        .fluent-typing {
          display: flex;
          gap: 6px;
          align-items: center;
          height: 24px;
          padding: 4px 0;
        }

        .fluent-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #3187F5;
          animation: fluentBounce 1s ease-in-out infinite;
        }

        @keyframes fluentBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }

        /* ── Input Area ── */
        .fluent-chat-input-area {
          padding: 16px 24px 20px;
          flex-shrink: 0;
        }

        .fluent-attach-preview {
          margin-bottom: 12px;
          position: relative;
          display: inline-block;
        }

        .fluent-attach-img {
          height: 70px;
          width: auto;
          border-radius: 14px;
          border: 1px solid rgba(143,204,255,.30);
          box-shadow: 0 4px 12px rgba(48,83,120,.12);
          object-fit: cover;
        }

        .fluent-attach-remove {
          position: absolute;
          top: -8px;
          right: -8px;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: #dc3c3c;
          color: white;
          border: 2px solid white;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: transform .15s ease;
        }

        .fluent-attach-remove:hover {
          transform: scale(1.1);
        }

        /* ── Input Capsule ── */
        .fluent-input-capsule {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          background: rgba(255,255,255,0.78);
          border: 1px solid rgba(255,255,255,0.9);
          border-radius: 28px;
          padding: 8px 10px 8px 8px;
          box-shadow: 0 10px 30px rgba(30,80,130,0.10);
          transition: all .2s ease;
        }

        /* ── Paperclip button ── */
        .fluent-paperclip-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 48px;
          height: 48px;
          min-width: 48px;
          border: none;
          background: #EAF4FF;
          color: #3187F5;
          cursor: pointer;
          border-radius: 22px;
          transition: all .2s ease;
          flex-shrink: 0;
        }

        .fluent-paperclip-btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(49, 135, 245, 0.15);
        }

        .fluent-paperclip-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        /* ── Textarea ── */
        .fluent-textarea {
          flex: 1;
          min-height: 48px;
          max-height: 180px;
          padding: 12px 16px;
          border: 1px solid rgba(210,225,245,0.7);
          border-radius: 18px;
          background: rgba(255,255,255,0.65);
          color: #17345F;
          font-family: inherit;
          font-size: 16px;
          line-height: 1.5;
          resize: none;
          outline: none;
          transition: all .2s ease;
          margin-bottom: 2px;
        }

        .fluent-textarea:focus {
          border-color: rgba(60,140,255,0.55);
          box-shadow: 0 0 0 4px rgba(59,130,246,0.08);
          background: #ffffff;
        }

        .fluent-textarea::placeholder {
          color: #7488A4;
        }

        .fluent-textarea:disabled {
          opacity: .6;
        }

        /* ── Send button ── */
        .fluent-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 54px;
          height: 54px;
          min-width: 54px;
          border: none;
          border-radius: 18px;
          background: linear-gradient(135deg, #47A5FF, #2684F5);
          color: white;
          cursor: pointer;
          flex-shrink: 0;
          transition: all .2s ease;
          box-shadow: 0 4px 15px rgba(38, 132, 245, 0.3);
        }

        .fluent-send-btn:hover:not(:disabled) {
          transform: translateY(-1px) scale(1.02);
          box-shadow: 0 6px 18px rgba(38, 132, 245, 0.4);
        }

        .fluent-send-btn:active:not(:disabled) {
          transform: translateY(0) scale(.98);
        }

        .fluent-send-btn:disabled {
          opacity: .5;
          cursor: not-allowed;
          box-shadow: none;
        }

        /* ── Disclaimer ── */
        .fluent-disclaimer {
          text-align: center;
          margin-top: 14px;
          font-size: 12px;
          color: #7488A4;
          letter-spacing: .01em;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 640px) {
          .fluent-chat-root {
            border-radius: 24px;
          }

          .fluent-chat-header {
            padding: 0 16px;
            height: 48px;
          }

          .fluent-chat-logo-area {
            margin: 8px 0 12px 0;
          }
          
          .fluent-logo-image {
            height: 40px;
          }

          .fluent-chat-messages {
            padding: 8px 16px 16px;
          }

          .fluent-ai-avatar {
            width: 38px;
            height: 38px;
            min-width: 38px;
          }

          .fluent-ai-avatar-icon {
            width: 18px;
            height: 18px;
          }

          .fluent-user-avatar {
            width: 38px;
            height: 38px;
            min-width: 38px;
          }

          .fluent-msg-bubble {
            max-width: 85%;
          }

          .fluent-bubble-ai, .fluent-bubble-user {
            padding: 6px 10px;
          }

          .fluent-chat-input-area {
            padding: 12px 16px 16px;
          }

          .fluent-input-capsule {
            gap: 8px;
            padding: 6px 8px 6px 6px;
          }

          .fluent-paperclip-btn {
            width: 44px;
            height: 44px;
            min-width: 44px;
            border-radius: 18px;
          }

          .fluent-textarea {
            font-size: 15px;
            padding: 10px 14px;
          }

          .fluent-send-btn {
            width: 48px;
            height: 48px;
            min-width: 48px;
            border-radius: 16px;
          }
        }
      `}</style>
    </div>
  );
};
