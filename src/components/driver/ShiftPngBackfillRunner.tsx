/**
 * Runner de backfill da Parte Diária (PNG).
 *
 * O envio principal ocorre no Fim de Turno em `DriverStatusButtons`. Porém,
 * quando o turno é encerrado por outro caminho (reset administrativo,
 * autoencerramento, offline, falha ao gerar o PNG no celular) só o texto
 * chegava no WhatsApp. Este runner garante que TODO turno finalizado receba a
 * Parte Diária em PNG no grupo.
 *
 * Proteções contra loop de envio:
 *  - qualquer registro `daily-shift-png-end` existente (qualquer status) marca
 *    o turno como já tratado;
 *  - cache local por sessão (`processedRef`);
 *  - índice único no banco em (origin, external_kind, external_id).
 */
import { useShiftPngBackfill } from "@/hooks/useShiftPngBackfill";

export function ShiftPngBackfillRunner() {
  useShiftPngBackfill(true);
  return null;
}
