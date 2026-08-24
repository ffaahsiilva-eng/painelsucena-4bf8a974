import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface AnnouncementImageProps {
  /** Pode ser um caminho bruto do storage ou uma URL (assinada/externa) */
  source: string;
  title?: string;
  className?: string;
}

/**
 * Exibe a imagem do comunicado. Resolve o caminho do storage por conta própria
 * (com nova tentativa em caso de falha), garantindo que a foto apareça mesmo
 * quando o hook não conseguiu assinar a URL previamente.
 */
export function AnnouncementImage({ source, title, className }: AnnouncementImageProps) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const objectUrlRef = useRef<string | null>(null);

  const clearObjectUrl = () => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  };

  const getStoragePath = (value: string) => {
    if (!value.startsWith("http")) return value.replace(/^site-assets\//, "");

    try {
      const url = new URL(value);
      const marker = "/site-assets/";
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex === -1) return null;
      return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    } catch {
      return null;
    }
  };

  const loadFromStorage = async (value: string) => {
    // 1. Tentar resolver como link assinado de longa duração primeiro
    const signedUrl = await resolveStorageUrl(value);
    if (signedUrl) {
      setSrc(signedUrl);
      return true;
    }

    // 2. Fallback para download direto caso a assinatura falhe
    const storagePath = getStoragePath(value);
    if (!storagePath) return false;

    const response = await supabase.storage
      .from("site-assets")
      .download(storagePath);
    
    const { data, error } = response || { data: null, error: new Error("Resposta inválida do storage") };

    if (error || !data) {
      console.error("[AnnouncementImage] Não foi possível baixar a imagem:", error);
      return false;
    }

    clearObjectUrl();
    const objectUrl = URL.createObjectURL(data);
    objectUrlRef.current = objectUrl;
    setSrc(objectUrl);
    return true;
  };

  const load = async (active = true) => {
    setFailed(false);
    setLoading(true);
    setSrc(null);
    clearObjectUrl();

    const raw = source?.trim();
    if (!raw) {
      setLoading(false);
      return;
    }

    if (raw.startsWith("http") && !raw.includes("/storage/v1/object/")) {
      setSrc(raw);
      setLoading(false);
      return;
    }

    const loaded = await loadFromStorage(raw);
    if (!active) return;
    
    setLoading(false);
    if (!loaded) setFailed(true);
  };

  useEffect(() => {
    let active = true;
    load(active);

    return () => {
      active = false;
      clearObjectUrl();
    };
  }, [source]);

  const handleError = async () => {
    // Para URLs legadas/assinadas, faz fallback para download autenticado.
    const loaded = await loadFromStorage(source);
    if (!loaded) setFailed(true);
  };

  if (failed) {
    return (
      <div className="w-full min-h-[200px] flex flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-red-200/50 bg-red-50/10 backdrop-blur-sm p-6 text-center">
        <div className="w-12 h-12 flex items-center justify-center rounded-full bg-red-100/20 text-red-500 animate-pulse ring-4 ring-red-500/10">
          <span className="text-2xl">⚠️</span>
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-white/90">Ops! A foto não carregou</p>
          <p className="text-xs text-white/50 max-w-[200px]">Isso pode ser um problema de conexão ou o arquivo expirou.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => load()}
          className="mt-2 bg-white/5 hover:bg-white/10 border-white/10 text-white gap-2 transition-all active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full rounded-lg overflow-hidden relative border border-black/5 bg-black/[0.02] min-h-[160px]">
      {!src ? (
        <div className="w-full aspect-video sm:h-40 flex items-center justify-center">
          <Skeleton className="w-full h-full absolute inset-0" />
          <div className="relative z-10 w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Skeleton mostrado enquanto o navegador ainda não renderizou a imagem carregada */}
          <Skeleton className="w-full h-full absolute inset-0" />
          <img
            key={src}
            src={src}
            alt={title ? `Imagem do comunicado: ${title}` : "Imagem do comunicado"}
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            className={className ?? "w-full h-auto max-h-[50vh] object-contain block mx-auto transition-opacity duration-300 relative z-10"}
            onError={handleError}
            onLoad={(e) => {
              (e.currentTarget as HTMLImageElement).style.opacity = '1';
            }}
            style={{ opacity: 0 }}
          />
        </>
      )}
    </div>
  );
}
