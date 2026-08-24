/**
 * Loga tentativas de login (sucesso e falha) na tabela auth_attempts.
 * Falhas no log NUNCA quebram o fluxo de autenticação.
 */
import { supabase } from "@/integrations/supabase/client";

export const logAuthAttempt = async (params: {
  email: string;
  success: boolean;
  failureReason?: string;
}): Promise<void> => {
  try {
    await supabase.from("auth_attempts").insert({
      email: params.email?.toLowerCase().slice(0, 254) ?? null,
      success: params.success,
      failure_reason: params.failureReason?.slice(0, 200) ?? null,
      user_agent: navigator.userAgent?.slice(0, 500) ?? null,
    });
  } catch {
    // silencia — log nunca pode bloquear login
  }
};
