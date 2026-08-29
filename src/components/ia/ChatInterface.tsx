import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, User, Loader2, RefreshCw, Paperclip, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

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

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "model", text: "Olá! Sou a Inteligência Artificial do painel. Como posso ajudar você hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [attachedImage, setAttachedImage] = useState<{ url: string; base64: string; mimeType: string } | null>(null);
  
  const scrollRef = useRef<HTMLDivElement>(null);
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
      const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
      
      if (!GEMINI_API_KEY) {
        throw new Error("A chave de API do Gemini (VITE_GEMINI_API_KEY) não está configurada no painel do Lovable nem no arquivo local .env.");
      }

      // Check if it's an image command
      const isImageCommand = userMessageText.toLowerCase().trim().startsWith("/imagem ");
      if (isImageCommand) {
        const imagePrompt = userMessageText.substring(8).trim();
        const safePrompt = encodeURIComponent(imagePrompt + " masterpiece, high resolution");
        const fallbackUrl = `https://image.pollinations.ai/prompt/${safePrompt}?nologo=true&model=flux&seed=${Math.floor(Math.random()*10000)}`;
        
        setMessages((prev) => 
          prev.map((msg) => 
            msg.id === aiMessageId 
              ? { ...msg, text: `Aqui está a imagem que você pediu:\n\n![Imagem gerada](${fallbackUrl})`, isStreaming: false } 
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
            text: "Você é um assistente virtual integrado ao painel SucenaPainel. Você consegue ler o banco de dados do sistema em tempo real chamando a ferramenta 'query_database'. Sempre que o usuário perguntar sobre dados operacionais (ex: quem saiu com o equipamento X, quais pipas foram pra manutenção, etc), use a ferramenta para consultar as tabelas (como equipment_movements, equipment, profiles, etc). Na tabela equipment_movements, os motivos de saída geralmente são 'manutencao_corretiva', 'manutencao_preventiva', etc. Se o usuário pedir imagem, oriente-o a usar '/imagem'. Seja amigável e responda em pt-br."
          }
        ]
      };

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      let isFunctionCallDone = false;
      let finalReply = "";
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
              const limit = Math.min(fnCall.args.limit || 15, 50); // limit max 50
              const match = fnCall.args.match || {};
              
              let query = supabase.from(table).select(select);
              
              if (match && typeof match === 'object') {
                for (const [k, v] of Object.entries(match)) {
                  query = query.eq(k, v);
                }
              }
              
              const { data: qData, error: qError } = await query.limit(limit).order('id', { ascending: false });
              
              if (qError) throw qError;
              dbResult = { success: true, data: qData, count: qData?.length };
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

      if (!finalReply && loops >= 3) {
        finalReply = "Desculpe, precisei analisar muitas tabelas e o limite de consultas consecutivas foi atingido.";
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
      toast.error("Erro ao comunicar com a IA. " + (error.message || "Tente novamente."));
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId 
            ? { ...msg, text: "Ocorreu um erro. " + (error.message || "Verifique se você inseriu a VITE_GEMINI_API_KEY corretamente."), isStreaming: false } 
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
    setMessages([{ id: Date.now().toString(), role: "model", text: "Histórico limpo. Como posso ajudar?" }]);
  };

  return (
    <div className="flex flex-col h-full bg-background rounded-md border shadow-sm max-w-5xl mx-auto">
      {/* Botões do topo */}
      <div className="flex justify-end p-2 border-b bg-muted/20">
        <Button variant="ghost" size="sm" onClick={clearChat} className="text-xs text-muted-foreground h-7">
          <RefreshCw className="w-3 h-3 mr-1" /> Limpar conversa
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4 overflow-y-auto" ref={scrollRef as any}>
        <div className="space-y-6 pb-20 max-w-3xl mx-auto">
          {messages.map((message) => (
            <div 
              key={message.id} 
              className={cn(
                "flex gap-4",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "model" && (
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                  <Sparkles className="w-4 h-4 text-primary" />
                </div>
              )}
              
              <div 
                className={cn(
                  "px-4 py-3 rounded-2xl max-w-[85%] text-sm shadow-sm",
                  message.role === "user" 
                    ? "bg-primary text-primary-foreground rounded-tr-sm" 
                    : "bg-muted border rounded-tl-sm prose prose-sm dark:prose-invert prose-img:rounded-xl prose-img:w-full prose-img:max-w-md prose-img:shadow-md"
                )}
              >
                {message.isStreaming && !message.text ? (
                  <div className="flex items-center gap-1.5 h-5">
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <div className={cn("break-words", message.role === "user" ? "text-white" : "text-foreground")}>
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
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0 border">
                  <User className="w-4 h-4 text-secondary-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Área de Input */}
      <div className="p-4 border-t bg-card shrink-0">
        <div className="max-w-4xl mx-auto">
          {/* Pré-visualização do anexo */}
          {attachedImage && (
            <div className="mb-3 relative inline-block">
              <img src={attachedImage.url} alt="Anexo" className="h-20 w-auto rounded-lg border shadow-sm object-cover" />
              <button
                onClick={() => setAttachedImage(null)}
                className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full hover:bg-destructive/90 shadow-sm"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-muted/30 border rounded-2xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="mb-[2px] shrink-0 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
              title="Anexar imagem"
            >
              <Paperclip className="h-5 w-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                autoResize();
              }}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte qualquer coisa ou peça uma imagem (/imagem)..."
              className="min-h-[44px] max-h-[200px] border-0 focus-visible:ring-0 bg-transparent resize-none py-3 px-2 shadow-none"
              rows={1}
              disabled={isLoading}
            />
            <Button 
              onClick={handleSend} 
              disabled={(!input.trim() && !attachedImage) || isLoading}
              size="icon"
              className="mb-[2px] shrink-0 rounded-xl"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-muted-foreground">A IA pode cometer erros. Verifique informações importantes.</span>
        </div>
      </div>
    </div>
  );
};
