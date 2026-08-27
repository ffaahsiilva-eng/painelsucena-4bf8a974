import { useEffect, useState, useRef, useCallback } from "react";
import { X, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { subscribeToTable } from "@/lib/realtimeManager";
import { useAuth } from "@/hooks/useAuth";
import { useEnvironment } from "@/hooks/useEnvironment";
import { cn } from "@/lib/utils";
import { resolveStorageUrl } from "@/lib/storage";

interface Broadcast {
  id: string;
  origin: string | null;
  kind: string | null;
  message: string | null;
  image_url: string | null;
  caption: string | null;
  created_at: string;
  environment: string | null;
}

const AUTO_CLOSE_MS = 6_000;
const MAX_VISIBLE = 2;
const POLL_INTERVAL_MS = 20_000;
const RECENT_WINDOW_MS = 60_000;

const ORIGIN_LABEL: Record<string, string> = {
  aso: "ASO",
  matrix: "Matriz de Treinamentos",
  campaign: "Campanha do Mês",
  "forbidden-color": "Cor Proibida",
  planning: "Planejamento",
  reminder: "Lembrete",
  desvio: "Desvio",
  desvio_due: "Prazo de Desvio",
  desvio_status: "Status de Desvio",
  desvio_correction: "Correção de Desvio",
  dds: "DDS",
  dds_photo: "DDS - Lista de Presença",
  "driver-status": "Motorista",
  "driver-app-reminder": "Motorista",
  "shift-end-reminder": "Fim de Turno",
  "daily-shift-report": "Parte Diária",
  "planned-activities": "Atividade Planejada",
  cronograma_mirante: "Cronograma Mirante",
  "equipment-movement": "Movimentação de Equipamento",
  "equipment-mobilization": "Mobilização de Equipamento",
  // As origens abaixo são silenciadas no banco, mas mantemos o mapeamento por segurança
  requisition_epi: "Requisição de EPI",
  requisition_material: "Requisição de Material",
  order: "Pedido",
  order_group: "Pedido",
  inventory_change: "Alteração de Estoque",
  "inventory-change": "Alteração de Estoque",
  low_stock: "Estoque Baixo",
  attendance_gabiao: "Presença - Gabião",
  attendance_jardinagem: "Presença - Jardinagem",
  attendance_adm: "Presença - ADM",
  attendance_transporte: "Presença - Transporte",
  attendance_missing_alert: "Falta de Presença",
  "ata-contrato": "Ata de Contrato",
  "site-inspection-done": "Inspeção de Canteiro",
  "sling-inspection": "Vistoria de Cintas",
  "vehicle-inspection": "Vistoria de Veículo",
  training: "Treinamento",
  "pos-chuva": "Pós-Chuva",
};

function labelFor(origin: string | null) {
  if (!origin) return "Notificação WhatsApp";
  return ORIGIN_LABEL[origin] || "Notificação WhatsApp";
}

// Render *bold* segments (WhatsApp style)
function renderMessage(text: string) {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((p, i) =>
    p.startsWith("*") && p.endsWith("*") && p.length > 2 ? (
      <strong key={i}>{p.slice(1, -1)}</strong>
    ) : (
      <span key={i}>{p}</span>
    )
  );
}

export function WapiBroadcastToaster() {
  const { user } = useAuth();
  const { environment } = useEnvironment();
  const [items, setItems] = useState<Broadcast[]>([]);
  const mountedAtRef = useRef<number>(Date.now());
  const seenIdsRef = useRef<Set<string>>(new Set());

  const pushBroadcast = useCallback(async (row: Broadcast) => {
    if (!row || !row.id) return;
    if (seenIdsRef.current.has(row.id)) return;
    const rowTs = new Date(row.created_at).getTime();
    // Ignora anúncios antigos (mais de 60s antes do mount) — evita re-mostrar
    // após reload, mas ainda pega o que escapou do realtime há poucos segundos.
    if (rowTs < mountedAtRef.current - RECENT_WINDOW_MS) return;
    if (!row.environment || row.environment !== environment) return;

    seenIdsRef.current.add(row.id);

    // Resolve storage URL if it looks like a Supabase path
    let displayUrl = row.image_url;
    if (displayUrl && !displayUrl.startsWith("http")) {
      displayUrl = await resolveStorageUrl(displayUrl);
    }

    const finalRow = { ...row, image_url: displayUrl };

    setItems((prev) => {
      if (prev.some((p) => p.id === finalRow.id)) return prev;
      return [finalRow, ...prev].slice(0, MAX_VISIBLE);
    });

    setTimeout(() => {
      setItems((prev) => prev.filter((p) => p.id !== row.id));
    }, AUTO_CLOSE_MS);
  }, [environment]);

  // Realtime subscription (primary channel)
  useEffect(() => {
    if (!user || !environment) return;
    mountedAtRef.current = Date.now();

    return subscribeToTable(
      { event: "INSERT", table: "wapi_broadcasts" },
      (payload) => pushBroadcast(payload.new as Broadcast)
    );
  }, [user, environment, pushBroadcast]);

  // Polling fallback — garante entrega mesmo se realtime cair ou ficar ocioso
  useEffect(() => {
    if (!user || !environment) return;
    let cancelled = false;
    let sinceIso = new Date(Date.now() - 10_000).toISOString();

    const poll = async () => {
      try {
        const { data, error } = await supabase
          .from("wapi_broadcasts")
          .select("id, origin, kind, message, image_url, caption, created_at, environment")
          .eq("environment", environment)
          .gt("created_at", sinceIso)
          .order("created_at", { ascending: true })
          .limit(20);
          
        // Fallback: ping WAPI queue worker in case pg_cron is suspended/failing
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/wapi-queue-worker`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        }).catch(() => {});

        if (cancelled || error || !data) return;
        for (const row of data) {
          pushBroadcast(row as Broadcast);
          if (row.created_at > sinceIso) sinceIso = row.created_at;
        }
      } catch {
        // ignore
      }
    };

    const interval = window.setInterval(poll, POLL_INTERVAL_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", poll);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", poll);
    };
  }, [user, environment, pushBroadcast]);

  const dismiss = (id: string) =>
    setItems((prev) => prev.filter((p) => p.id !== id));

  const isSelectingEnvironment = window.location.pathname === "/selecao-ambiente";
  const isLoginTransitioning = sessionStorage.getItem("loginTransitionInProgress") === "true";

  if (!user || !environment || items.length === 0 || isSelectingEnvironment || isLoginTransitioning) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-4 right-4 z-[100] hidden sm:flex flex-col gap-2 max-w-[92vw] sm:max-w-sm pointer-events-none">
      {items.map((b) => {
        const text = b.caption || b.message || "";
        return (
          <div
            key={b.id}
            className={cn(
              "pointer-events-auto rounded-xl border border-emerald-500/30 bg-card/95 backdrop-blur shadow-xl overflow-hidden",
              "animate-in slide-in-from-right-4 fade-in duration-300"
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border-b border-emerald-500/20">
              <MessageCircle className="h-4 w-4 text-[#25D366] shrink-0" />
              <p className="text-xs font-semibold flex-1 truncate">
                {labelFor(b.origin)} — enviado no WhatsApp
              </p>
              <button
                type="button"
                onClick={() => dismiss(b.id)}
                className="p-0.5 rounded hover:bg-muted/60 text-muted-foreground hover:text-foreground transition"
                aria-label="Fechar"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 flex gap-3 items-start">
              {b.image_url && (
                <img
                  src={b.image_url}
                  alt=""
                  className="w-16 h-16 rounded object-cover shrink-0 border"
                  loading="lazy"
                />
              )}
              <p className="text-xs text-foreground whitespace-pre-wrap leading-snug line-clamp-[10] break-words">
                {renderMessage(text)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
