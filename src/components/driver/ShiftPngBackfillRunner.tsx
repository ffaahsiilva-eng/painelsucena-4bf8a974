/**
 * Runner de backfill da Parte Diária (PNG) — DESATIVADO.
 *
 * O envio principal já ocorre no fluxo de Fim de Turno em `DriverStatusButtons`
 * e a edge function `wapi-driver-status-notify` faz dedup por `shiftRecordId`.
 * O runner ficou reenfileirando o mesmo PNG várias vezes por minuto quando a
 * dedup do servidor falhava, resultando em envios em loop no grupo do
 * WhatsApp. Mantemos o componente como no-op para não quebrar imports.
 */
export function ShiftPngBackfillRunner() {
  return null;
}
