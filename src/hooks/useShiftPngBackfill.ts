import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { generateAndUploadParteDiariaPng } from "@/lib/parteDiariaShare";

/**
 * Mantém a consistência do envio da Parte Diária (PNG) no grupo do WhatsApp.
 *
 * Para todo `daily_shift_records` finalizado HOJE (shift_end_time não nulo)
 * que ainda NÃO tem uma entrada de imagem (`daily-shift-png`) no `wapi_outbox`,
 * este hook gera o PNG e enfileira o envio via `wapi-driver-status-notify`.
 *
 * Roda em qualquer cliente conectado (admin/painel/motorista). Idempotente:
 * a edge function dedup por `external_id` (shiftRecordId).
 */
export function useShiftPngBackfill(enabled: boolean = true) {
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;

    const tick = async () => {
      if (runningRef.current) return;
      if (!navigator.onLine) return;
      runningRef.current = true;
      try {
        // Pará timezone (UTC-3) → considerar últimos 3 dias, para recuperar
        // PNGs de fim de turno perdidos em dias anteriores (ex.: motorista
        // fechou o app antes do upload).
        const paraNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
        const today = paraNow.toISOString().slice(0, 10);
        const since = new Date(paraNow.getTime() - 3 * 24 * 60 * 60 * 1000)
          .toISOString()
          .slice(0, 10);

        const { data: shifts } = await supabase
          .from("daily_shift_records")
          .select(
            "id, equipment_id, equipment_name, plate, driver_name, shift_end_time, shift_date, final_horimeter, final_km, final_fuel_level"
          )
          .gte("shift_date", since)
          .lte("shift_date", today)
          .not("shift_end_time", "is", null)
          .order("shift_end_time", { ascending: false })
          .limit(50);

        if (!shifts || shifts.length === 0) return;

        const ids = shifts.map((s) => s.id);
        const { data: existingPng } = await supabase
          .from("wapi_outbox")
          .select("external_id, status")
          .eq("origin", "driver-status")
          .eq("external_kind", "daily-shift-png-end")
          .in("external_id", ids);

        const alreadyDone = new Set(
          (existingPng || [])
            .filter((r) => ["pending", "processing", "sent"].includes(r.status as string))
            .map((r) => r.external_id as string)
        );

        const pending = shifts.filter((s) => !alreadyDone.has(s.id));
        if (pending.length === 0) return;

        for (const shift of pending) {
          try {
            const { data: eq } = await supabase
              .from("equipment")
              .select("*")
              .eq("id", shift.equipment_id)
              .maybeSingle();
            if (!eq) continue;

            // Padrão: gera Parte Diária para TODOS os equipamentos no fim de turno.
            const driver = (shift.driver_name || "").trim();
            if (!driver || driver === "—") continue;

            const url = await generateAndUploadParteDiariaPng(eq as any);
            if (!url) continue;

            const fuelLabel: Record<string, string> = {
              empty: "Vazio",
              quarter: "1/4",
              half: "1/2",
              three_quarters: "3/4",
              full: "Cheio",
            };
            const extra = [
              shift.final_fuel_level
                ? `*Combustível final:* ${fuelLabel[shift.final_fuel_level] || shift.final_fuel_level}`
                : null,
              shift.final_horimeter != null ? `*Horímetro:* ${shift.final_horimeter}` : null,
              shift.final_km != null ? `*KM:* ${shift.final_km}` : null,
            ]
              .filter(Boolean)
              .join("\n");

            await supabase.functions.invoke("wapi-driver-status-notify", {
              body: {
                equipmentId: shift.equipment_id,
                equipmentName: shift.equipment_name,
                plate: shift.plate,
                newStatus: "end_of_shift",
                driverName: shift.driver_name || null,
                extraInfo: extra || undefined,
                shiftRecordId: shift.id,
                imageUrl: url,
                imageCaption: `📄 *PARTE DIÁRIA*\n${shift.equipment_name} — ${shift.plate}\nMotorista: ${shift.driver_name || "—"}`,
              },
            });
          } catch (err) {
            console.warn("[useShiftPngBackfill] falha em shift", shift.id, err);
          }
        }
      } catch (err) {
        console.warn("[useShiftPngBackfill] tick falhou", err);
      } finally {
        runningRef.current = false;
      }
    };

    // Primeiro tick rápido para recuperar Fim de Turno em backlog.
    const initial = setTimeout(tick, 4000);
    const interval = setInterval(tick, 60_000);
    return () => {
      clearTimeout(initial);
      clearInterval(interval);
    };
  }, [enabled]);
}
