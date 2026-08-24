import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSPrompt, setShowIOSPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
      return;
    }

    // Check if dismissed recently (within 7 days)
    const dismissedAt = localStorage.getItem("pwa-install-dismissed");
    if (dismissedAt) {
      const dismissedDate = new Date(dismissedAt);
      const daysSinceDismissed = (Date.now() - dismissedDate.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceDismissed < 7) {
        return;
      }
    }

    // Listen for beforeinstallprompt (Android/Chrome)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstall);

    // Check if iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches;
    
    if (isIOS && !isInStandaloneMode) {
      // Show iOS prompt after a delay
      setTimeout(() => setShowBanner(true), 3000);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setIsInstalled(true);
      }
      setDeferredPrompt(null);
      setShowBanner(false);
    } else {
      // iOS - show instructions
      setShowIOSPrompt(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem("pwa-install-dismissed", new Date().toISOString());
  };

  if (isInstalled || !showBanner) return null;

  return (
    <>
      {/* Install Banner */}
      <div className="fixed bottom-20 left-4 right-4 md:left-auto md:right-4 md:w-80 z-50 animate-in slide-in-from-bottom-4 duration-300">
        <div className="bg-card border border-border rounded-xl shadow-2xl p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
          
          <div className="flex items-start gap-3">
            <img loading="lazy" decoding="async" 
              src="/pwa-icon.png" 
              alt="App Logo" 
              className="w-12 h-12 rounded-xl shrink-0"
            />
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm">Instalar App</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Adicione à tela inicial para acesso rápido
              </p>
            </div>
          </div>
          
          <Button 
            onClick={handleInstallClick}
            className="w-full mt-3 gap-2"
            size="sm"
          >
            <Download className="w-4 h-4" />
            Instalar Agora
          </Button>
        </div>
      </div>

      {/* iOS Instructions Dialog */}
      <Dialog open={showIOSPrompt} onOpenChange={setShowIOSPrompt}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <img loading="lazy" decoding="async" src="/pwa-192x192.png" alt="App Logo" className="w-6 h-6 rounded" />
              Instalar no iPhone/iPad
            </DialogTitle>
            <DialogDescription>
              Siga os passos abaixo para instalar o app
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                1
              </div>
              <div>
                <p className="font-medium text-sm">Toque no botão Compartilhar</p>
                <p className="text-xs text-muted-foreground">
                  O ícone de quadrado com seta para cima na barra do Safari
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                2
              </div>
              <div>
                <p className="font-medium text-sm">Role e toque em "Adicionar à Tela de Início"</p>
                <p className="text-xs text-muted-foreground">
                  Pode ser necessário rolar para encontrar esta opção
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                3
              </div>
              <div>
                <p className="font-medium text-sm">Toque em "Adicionar"</p>
                <p className="text-xs text-muted-foreground">
                  O app será instalado na sua tela inicial
                </p>
              </div>
            </div>
          </div>
          
          <Button onClick={() => setShowIOSPrompt(false)} className="w-full">
            Entendi
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
