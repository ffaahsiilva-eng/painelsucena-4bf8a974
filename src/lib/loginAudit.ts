import { supabase } from "@/integrations/supabase/client";

export interface LogLoginInput {
  userId?: string | null;
  email?: string | null;
  success: boolean;
  errorCode?: string | null;
  errorMessage?: string | null;
  durationMs?: number | null;
}

/**
 * Registra silenciosamente uma tentativa de login em `driver_login_audit`.
 * Nunca lança — em falha só faz console.warn. Só Admin lê o histórico.
 */
export async function logLoginAttempt(input: LogLoginInput): Promise<void> {
  try {
    const screen =
      typeof window !== "undefined" && window.screen
        ? `${window.screen.width}x${window.screen.height}`
        : null;
    await (supabase as any).from("driver_login_audit").insert({
      user_id: input.userId ?? null,
      email: input.email ?? null,
      success: input.success,
      error_code: input.errorCode ?? null,
      error_message: input.errorMessage ?? null,
      duration_ms: input.durationMs ?? null,
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
      is_online: typeof navigator !== "undefined" ? navigator.onLine : null,
      screen,
    });
  } catch (e) {
    console.warn("[loginAudit] failed", e);
  }
}
