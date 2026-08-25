import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, User, Loader2, Bot, StopCircle, RefreshCw } from "lucide-react";
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

export const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: "1", role: "model", text: "Olá! Sou a Inteligência Artificial do painel. Como posso ajudar você hoje?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
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

    const userMessage: Message = { id: Date.now().toString(), role: "user", text: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setIsLoading(true);

    // Adiciona uma mensagem temporária da IA
    const aiMessageId = (Date.now() + 1).toString();
    setMessages((prev) => [...prev, { id: aiMessageId, role: "model", text: "", isStreaming: true }]);

    try {
      const { data, error } = await supabase.functions.invoke("gemini-chat", {
        body: { 
          // Envia o histórico (limitado às últimas 10 para não sobrecarregar o contexto se não for necessário)
          history: messages.slice(-10).map(m => ({ role: m.role, parts: [{ text: m.text }] })),
          message: userMessage.text 
        },
      });

      if (error) throw error;
      
      const responseText = data.text || "Desculpe, não consegui gerar uma resposta.";

      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId 
            ? { ...msg, text: responseText, isStreaming: false } 
            : msg
        )
      );

    } catch (error: any) {
      console.error("Erro no chat:", error);
      toast.error("Erro ao comunicar com a IA. Tente novamente.");
      setMessages((prev) => 
        prev.map((msg) => 
          msg.id === aiMessageId 
            ? { ...msg, text: "Ocorreu um erro de conexão. Verifique sua chave de API do Gemini.", isStreaming: false } 
            : msg
        )
      );
    } finally {
      setIsLoading(false);
    }
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
                  <ReactMarkdown 
                    className={cn("break-words", message.role === "user" ? "text-white" : "text-foreground")}
                  >
                    {message.text}
                  </ReactMarkdown>
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

      <div className="p-4 bg-background border-t">
        <div className="max-w-3xl mx-auto relative flex items-end gap-2 bg-muted/30 border rounded-2xl p-2 shadow-sm focus-within:ring-1 focus-within:ring-primary focus-within:border-primary transition-all">
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte qualquer coisa para a IA..."
            className="min-h-[44px] max-h-[200px] border-0 focus-visible:ring-0 bg-transparent resize-none py-3 px-2 shadow-none"
            rows={1}
            disabled={isLoading}
          />
          <Button 
            onClick={handleSend} 
            disabled={!input.trim() || isLoading}
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
          </Button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-muted-foreground">A IA pode cometer erros. Verifique informações importantes.</span>
        </div>
      </div>
    </div>
  );
};
