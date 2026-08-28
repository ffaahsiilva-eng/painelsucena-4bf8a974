import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Fallback client-side pinger para processar a fila W-API.
 * Isso garante que mesmo se o pg_cron do Supabase falhar, 
 * a fila continuará sendo processada desde que alguém esteja com o painel aberto.
 */
export function WapiQueuePinger() {
  useEffect(() => {
    // Função para chamar o worker
    const pingWorker = async () => {
      try {
        await supabase.functions.invoke('wapi-queue-worker', {
          method: 'POST',
          body: {}
        });
      } catch (e) {
        // Ignora erros silenciosamente (worker já pode estar rodando ou offline)
        console.warn("wapi-queue-worker ping failed:", e);
      }
    };

    // Chama imediatamente ao montar
    pingWorker();

    // Configura para chamar a cada 1 minuto (60000 ms)
    const interval = setInterval(pingWorker, 60000);

    return () => clearInterval(interval);
  }, []);

  return null; // Não renderiza nada visualmente
}
