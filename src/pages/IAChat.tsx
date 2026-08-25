import React from "react";
import Layout from "@/components/layout/Layout";
import { ChatInterface } from "@/components/ia/ChatInterface";
import { Sparkles } from "lucide-react";

export default function IAChat() {
  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-5rem)] bg-background">
        <div className="flex items-center gap-2 p-4 border-b bg-card/50 backdrop-blur-sm z-10">
          <div className="p-2 bg-primary/10 rounded-full">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Assistente IA</h1>
            <p className="text-xs text-muted-foreground">Gemini 1.5 - Powered by Google</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          <ChatInterface />
        </div>
      </div>
    </Layout>
  );
}
