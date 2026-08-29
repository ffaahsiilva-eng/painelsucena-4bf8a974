import React, { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
import { cn } from '@/lib/utils';
import { useLocation } from 'react-router-dom';

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  // Se já estiver na página inteira da IA (se existir uma /ia ou parecida), não mostrar
  // Mas como a IA agora é flutuante, podemos mostrar em todas as páginas exceto as de login
  if (location.pathname === '/auth') {
    return null;
  }

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl transition-all duration-300 hover:scale-105 flex items-center justify-center p-0 ring-4 ring-background",
            isOpen 
              ? "bg-destructive hover:bg-destructive/90 text-destructive-foreground" 
              : "bg-primary hover:bg-primary/90 text-primary-foreground"
          )}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6 animate-pulse" />}
        </Button>
      </div>

      {isOpen && (
        <div className="fixed bottom-24 right-6 w-[420px] h-[650px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-48px)] z-50 bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in zoom-in-95 duration-200">
          <div className="bg-primary text-primary-foreground p-3 font-medium flex items-center justify-between shrink-0 shadow-md z-10">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-300" />
              <span>Assistente Sucena IA</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20 hover:text-white rounded-full" 
              onClick={() => setIsOpen(false)}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-hidden relative">
            <ChatInterface />
          </div>
        </div>
      )}
    </>
  );
}
