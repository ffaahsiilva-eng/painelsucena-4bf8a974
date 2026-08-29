import React, { useState, useEffect } from 'react';
import { Sparkles, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChatInterface } from './ChatInterface';
import { useLocation } from 'react-router-dom';

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setIsOpen(prev => !prev);
    window.addEventListener("toggle-ia-chat", handler);
    return () => window.removeEventListener("toggle-ia-chat", handler);
  }, []);

  // Hide on auth and driver pages
  if (location.pathname === '/auth') {
    return null;
  }

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-12 right-6 w-[420px] h-[600px] max-h-[calc(100vh-120px)] max-w-[calc(100vw-48px)] z-[70] bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom-5 fade-in zoom-in-95 duration-200">
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
  );
}
