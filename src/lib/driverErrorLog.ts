import { supabase } from "@/integrations/supabase/client";

export interface DriverErrorContext {
  action: string;
  driverName?: string | null;
  equipmentId?: string | null;
  equipmentName?: string | null;
  errorMessage?: string | null;
  errorCode?: string | null;
  context?: Record<string, unknown> | null;
  isOnline?: boolean | null;
}

/**
 * Registra silenciosamente qualquer erro do painel do motorista em
 * `driver_error_log` para diagnóstico posterior pelos administradores.
 * Nunca lança — em falha só faz console.warn.
 */
export async function logDriverError(input: DriverErrorContext): Promise<void> {
  try {
    const { data: userData } = await supabase.auth.getUser();
    const userId = userData?.user?.id ?? null;

    await (supabase as any).from("driver_error_log").insert({
      user_id: userId,
      driver_name: input.driverName ?? null,
      equipment_id: input.equipmentId ?? null,
      equipment_name: input.equipmentName ?? null,
      action: input.action,
      error_message:
        input.errorMessage ?? (input.context ? JSON.stringify(input.context) : null),
      error_code: input.errorCode ?? null,
      context: (input.context as any) ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      is_online:
        input.isOnline ?? (typeof navigator !== "undefined" ? navigator.onLine : null),
    });
  } catch (e) {
    console.warn("[driverErrorLog] failed", e);
  }
}
