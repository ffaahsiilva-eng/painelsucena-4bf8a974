import React, { useState, useRef, useEffect } from "react";
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

interface ChatInterfaceProps {
  onClose?: () => void;
}

export const ChatInterface = ({ onClose }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "model", text: "Olá! Sou a Inteligência Artificial do painel.\nComo posso ajudar você hoje?" }
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

      // Check cache before hitting API
      const cacheKey = `ai_cache_${userMessageText.toLowerCase().trim()}`;
      const cachedResponse = localStorage.getItem(cacheKey);
      
      if (cachedResponse) {
        try {
          const parsedCache = JSON.parse(cachedResponse);
          // Expiration of 10 minutes (600,000 ms)
          if (Date.now() - parsedCache.timestamp < 600000) {
            setMessages((prev) => 
              prev.map((msg) => 
                msg.id === aiMessageId 
                  ? { ...msg, text: parsedCache.text + "\n\n*(Resposta rápida do cache)*", isStreaming: false } 
                  : msg
              )
            );
            setIsLoading(false);
            return;
          }
        } catch (e) {
          // ignore cache errors
        }
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
            text: "Você é um assistente virtual integrado ao painel SucenaPainel. Você consegue ler o banco de dados do sistema em tempo real chamando a ferramenta 'query_database'.\n\nDICA DE OURO: Para evitar bloqueios de limite de cota, NUNCA faça queries para descobrir as colunas. Use as seguintes estruturas conhecidas:\n- Tabela `equipment`: id, name, type, equipment_type, status, plate, brand, environment\n- Tabela `equipment_movements`: id, equipment_name, exit_reason (ex: 'manutencao_corretiva', 'operacao', 'manutencao_preventiva', 'comboio'), environment, created_at, created_by\n- Tabela `profiles`: id, full_name, cargo, environment\n\nATENÇÃO MÁXIMA 1: Faça APENAS UMA chamada de função. Se a consulta retornar vazia ([]), NÃO tente fazer outra busca, apenas responda 'Não encontrei dados'. NUNCA faça consultas em loop.\nATENÇÃO MÁXIMA 2: Sempre que houver alguma pergunta sobre informações internas sensíveis, dados financeiros, ou qualquer assunto exclusivo apenas para administradores, NÃO responda diretamente. Diga apenas para o usuário entrar em contato com o administrador do sistema.\n\nSeja amigável e responda em pt-br."
          }
        ]
      };

      const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;
      
      let isFunctionCallDone = false;
      let finalReply = "";
      let loops = 0;

      // Limitado a 3 loops para não estourar a cota gratuita do Gemini (15 req/min)
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

      if (!finalReply && loops >= 8) {
        finalReply = "Desculpe, precisei analisar muitas tabelas e o limite de consultas consecutivas foi atingido.";
      }

      // Save to cache if it's a valid answer
      if (finalReply && !finalReply.includes("Não encontrei dados") && !finalReply.includes("Desculpe") && !finalReply.includes("Ocorreu um erro")) {
        localStorage.setItem(cacheKey, JSON.stringify({
          text: finalReply,
          timestamp: Date.now()
        }));
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
    setMessages([{ id: Date.now().toString(), role: "model", text: "Histórico limpo. Como posso ajudar?" }]);
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
                <div className="fluent-ai-avatar">
                  <Sparkles className="fluent-ai-avatar-icon" />
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
                  </div>
                )}
              </div>

              {message.role === "user" && (
                <div className="fluent-user-avatar">
                  <User className="w-4 h-4" />
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
            <Paperclip className="w-5 h-5" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte qualquer coisa ou peça um resumo do painel!"
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
           Windows 11 Fluent Design — Chat Panel
           ═══════════════════════════════════════════ */

        .fluent-chat-root {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          font-family: 'Segoe UI', 'Inter', system-ui, -apple-system, sans-serif;
          background: linear-gradient(145deg, rgba(248,252,255,.88), rgba(236,245,255,.72));
          backdrop-filter: blur(28px) saturate(145%);
          -webkit-backdrop-filter: blur(28px) saturate(145%);
          border: 1px solid rgba(255,255,255,.78);
          border-radius: 26px;
          box-shadow:
            0 24px 70px rgba(48,83,120,.18),
            0 6px 20px rgba(65,110,160,.10),
            inset 0 1px 0 rgba(255,255,255,.90);
          overflow: hidden;
          color: #18345F;
        }

        /* ── Header ── */
        .fluent-chat-header {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          padding: 16px 20px 8px;
          flex-shrink: 0;
        }

        .fluent-clear-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 14px;
          border: none;
          background: transparent;
          color: #18345F;
          font-size: 14px;
          font-weight: 500;
          font-family: inherit;
          cursor: pointer;
          border-radius: 12px;
          transition: all .18s ease;
        }

        .fluent-clear-btn:hover {
          background: rgba(78,166,255,.10);
          color: #4EA6FF;
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
          width: 32px;
          height: 32px;
          border: none;
          background: transparent;
          color: #6E7F94;
          cursor: pointer;
          border-radius: 10px;
          transition: all .15s ease;
        }

        .fluent-close-btn:hover {
          background: rgba(220,60,60,.12);
          color: #dc3c3c;
        }

        /* ── Messages scrollable area ── */
        .fluent-chat-messages {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding: 8px 20px 16px;
          scroll-behavior: smooth;
        }

        .fluent-chat-messages::-webkit-scrollbar {
          width: 5px;
        }

        .fluent-chat-messages::-webkit-scrollbar-track {
          background: transparent;
        }

        .fluent-chat-messages::-webkit-scrollbar-thumb {
          background: rgba(78,166,255,.18);
          border-radius: 10px;
        }

        .fluent-chat-messages::-webkit-scrollbar-thumb:hover {
          background: rgba(78,166,255,.35);
        }

        .fluent-messages-inner {
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        /* ── Message row ── */
        .fluent-msg-row {
          display: flex;
          gap: 12px;
          align-items: flex-start;
          animation: fluentMsgIn .32s cubic-bezier(.16,1,.3,1) both;
        }

        .fluent-msg-user {
          justify-content: flex-end;
        }

        .fluent-msg-ai {
          justify-content: flex-start;
        }

        @keyframes fluentMsgIn {
          from {
            opacity: 0;
            transform: translateY(8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* ── AI Avatar ── */
        .fluent-ai-avatar {
          width: 48px;
          height: 48px;
          min-width: 48px;
          border-radius: 50%;
          background: linear-gradient(145deg, rgba(200,225,255,.55), rgba(175,210,255,.40));
          border: 1.5px solid rgba(143,204,255,.50);
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow:
            0 2px 12px rgba(78,166,255,.18),
            inset 0 1px 0 rgba(255,255,255,.70);
          flex-shrink: 0;
          margin-top: 2px;
        }

        .fluent-ai-avatar-icon {
          width: 22px;
          height: 22px;
          color: #4EA6FF;
          filter: drop-shadow(0 0 4px rgba(78,166,255,.35));
        }

        /* ── User Avatar ── */
        .fluent-user-avatar {
          width: 34px;
          height: 34px;
          min-width: 34px;
          border-radius: 50%;
          background: linear-gradient(145deg, #4EA6FF, #3d8de0);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: white;
          margin-top: 2px;
        }

        /* ── Message Bubbles ── */
        .fluent-msg-bubble {
          max-width: 82%;
          word-break: break-word;
        }

        .fluent-bubble-ai {
          padding: 16px 20px;
          border-radius: 20px;
          background: linear-gradient(145deg, rgba(255,255,255,.82), rgba(248,252,255,.60));
          border: 1px solid rgba(255,255,255,.90);
          box-shadow:
            0 3px 16px rgba(48,83,120,.08),
            0 1px 4px rgba(48,83,120,.06),
            inset 0 1px 0 rgba(255,255,255,.85);
        }

        .fluent-bubble-user {
          padding: 14px 18px;
          border-radius: 20px;
          background: linear-gradient(145deg, #4EA6FF, #3a95ee);
          color: white !important;
          box-shadow:
            0 3px 14px rgba(78,166,255,.28),
            inset 0 1px 0 rgba(255,255,255,.18);
        }

        .fluent-bubble-user .fluent-msg-text,
        .fluent-bubble-user .fluent-msg-text * {
          color: white !important;
        }

        /* ── Message Text ── */
        .fluent-msg-text {
          font-size: 15px;
          line-height: 1.6;
          color: #18345F;
        }

        .fluent-msg-text p {
          margin: 0 0 8px;
        }

        .fluent-msg-text p:last-child {
          margin-bottom: 0;
        }

        .fluent-msg-text strong {
          font-weight: 600;
        }

        .fluent-msg-text code {
          background: rgba(78,166,255,.08);
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 13px;
        }

        .fluent-msg-text pre {
          background: rgba(24,52,95,.06);
          padding: 12px;
          border-radius: 12px;
          overflow-x: auto;
          margin: 8px 0;
        }

        .fluent-msg-text ul, .fluent-msg-text ol {
          padding-left: 20px;
          margin: 8px 0;
        }

        .fluent-msg-text li {
          margin-bottom: 4px;
        }

        .fluent-msg-text a {
          color: #4EA6FF;
          text-decoration: underline;
        }

        /* ── Typing indicator ── */
        .fluent-typing {
          display: flex;
          gap: 5px;
          align-items: center;
          height: 24px;
          padding: 4px 0;
        }

        .fluent-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #8FCCFF;
          animation: fluentBounce .9s ease-in-out infinite;
        }

        @keyframes fluentBounce {
          0%, 80%, 100% { transform: translateY(0); opacity: .4; }
          40% { transform: translateY(-8px); opacity: 1; }
        }

        /* ── Input Area ── */
        .fluent-chat-input-area {
          padding: 12px 18px 14px;
          flex-shrink: 0;
        }

        .fluent-attach-preview {
          margin-bottom: 10px;
          position: relative;
          display: inline-block;
        }

        .fluent-attach-img {
          height: 64px;
          width: auto;
          border-radius: 12px;
          border: 1px solid rgba(143,204,255,.30);
          box-shadow: 0 2px 8px rgba(48,83,120,.10);
          object-fit: cover;
        }

        .fluent-attach-remove {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 20px;
          height: 20px;
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
          transform: scale(1.15);
        }

        /* ── Input Capsule ── */
        .fluent-input-capsule {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          background: linear-gradient(145deg, rgba(255,255,255,.72), rgba(248,252,255,.55));
          border: 1px solid rgba(255,255,255,.85);
          border-radius: 22px;
          padding: 8px 8px 8px 4px;
          box-shadow:
            0 4px 20px rgba(48,83,120,.08),
            0 1px 6px rgba(65,110,160,.06),
            inset 0 1px 0 rgba(255,255,255,.80);
          transition: all .2s ease;
        }

        .fluent-input-capsule:focus-within {
          border-color: rgba(78,166,255,.45);
          box-shadow:
            0 4px 20px rgba(48,83,120,.08),
            0 1px 6px rgba(65,110,160,.06),
            inset 0 1px 0 rgba(255,255,255,.80),
            0 0 0 3px rgba(78,166,255,.12);
        }

        /* ── Paperclip button ── */
        .fluent-paperclip-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          min-width: 40px;
          border: none;
          background: transparent;
          color: #1e6fd9;
          cursor: pointer;
          border-radius: 14px;
          transition: all .15s ease;
          flex-shrink: 0;
        }

        .fluent-paperclip-btn:hover:not(:disabled) {
          background: rgba(30,111,217,.12);
        }

        .fluent-paperclip-btn:disabled {
          opacity: .4;
          cursor: not-allowed;
        }

        /* ── Textarea ── */
        .fluent-textarea {
          flex: 1;
          min-height: 40px;
          max-height: 200px;
          padding: 10px 4px;
          border: none;
          background: transparent;
          color: #18345F;
          font-family: inherit;
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          outline: none;
        }

        .fluent-textarea::placeholder {
          color: #9CADC0;
        }

        .fluent-textarea:disabled {
          opacity: .5;
        }

        /* ── Send button ── */
        .fluent-send-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 52px;
          height: 52px;
          min-width: 52px;
          border: 1px solid rgba(78,166,255,.45);
          border-radius: 18px;
          background: linear-gradient(145deg, #4EA6FF, #3a95ee);
          color: white;
          cursor: pointer;
          flex-shrink: 0;
          transition: all .18s ease;
          box-shadow:
            0 3px 14px rgba(78,166,255,.28),
            inset 0 1px 0 rgba(255,255,255,.18);
        }

        .fluent-send-btn:hover:not(:disabled) {
          background: linear-gradient(145deg, #5eb0ff, #439df5);
          box-shadow:
            0 4px 18px rgba(78,166,255,.35),
            inset 0 1px 0 rgba(255,255,255,.25);
          transform: translateY(-1px);
        }

        .fluent-send-btn:active:not(:disabled) {
          transform: translateY(0) scale(.97);
        }

        .fluent-send-btn:disabled {
          opacity: .35;
          cursor: not-allowed;
        }

        /* ── Disclaimer ── */
        .fluent-disclaimer {
          text-align: center;
          margin-top: 10px;
          font-size: 11.5px;
          color: #6E7F94;
          letter-spacing: .01em;
        }

        /* ── Mobile overrides ── */
        @media (max-width: 640px) {
          .fluent-chat-root {
            border-radius: 22px;
          }

          .fluent-chat-header {
            padding: 12px 14px 6px;
          }

          .fluent-chat-messages {
            padding: 6px 14px 12px;
          }

          .fluent-ai-avatar {
            width: 40px;
            height: 40px;
            min-width: 40px;
          }

          .fluent-ai-avatar-icon {
            width: 18px;
            height: 18px;
          }

          .fluent-msg-bubble {
            max-width: 88%;
          }

          .fluent-bubble-ai {
            padding: 12px 16px;
          }

          .fluent-bubble-user {
            padding: 10px 14px;
          }

          .fluent-chat-input-area {
            padding: 8px 12px 10px;
          }

          .fluent-input-capsule {
            border-radius: 18px;
          }

          .fluent-send-btn {
            width: 46px;
            height: 46px;
            min-width: 46px;
            border-radius: 15px;
          }
        }
      `}</style>
    </div>
  );
};
