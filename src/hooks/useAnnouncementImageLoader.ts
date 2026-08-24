import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook para pré-carregar e manter uma URL de objeto para imagens do storage.
 * Garante carregamento imediato e limpeza de memória.
 */
export function useAnnouncementImageLoader(source: string | null) {
  const [src, setSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!source) {
      setSrc(null);
      return;
    }

    if (source.startsWith("blob:") || (source.startsWith("http") && !source.includes("/storage/v1/object/"))) {
      setSrc(source);
      return;
    }

    let active = true;
    setIsLoading(true);

    const load = async () => {
      try {
        const storagePath = source.replace(/^site-assets\//, "");
        const { data, error } = await supabase.storage
          .from("site-assets")
          .download(storagePath);

        if (error || !data) throw error;
        
        const url = URL.createObjectURL(data);
        if (active) {
          setSrc(url);
          setIsLoading(false);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (err) {
        console.error("Erro ao carregar imagem:", err);
        if (active) setIsLoading(false);
      }
    };

    load();

    return () => {
      active = false;
      if (src?.startsWith("blob:")) {
        URL.revokeObjectURL(src);
      }
    };
  }, [source]);

  return { src, isLoading };
}
