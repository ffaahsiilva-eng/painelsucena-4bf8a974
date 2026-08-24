import { supabase } from "@/integrations/supabase/client";

/**
 * Fila de idempotência para ações críticas do motorista.
 *
 * Uso: gere um `client_action_id` (uuid) por CLIQUE do usuário
 * (não por retry). Chame `beginDriverAction` antes de rodar a mutação.
 * Se o banco rejeitar por UNIQUE, a ação já foi registrada antes — abortar.
 * Depois chame `commitDriverAction` ou `failDriverAction`.
 */

export interface BeginDriverActionInput {
  clientActionId: string;
  driverId: string | null;
  equipmentId: string | null;
  action: string;
  payload?: Record<string, unknown> | null;
  isOnline?: boolean | null;
}

export type BeginResult =
  | { ok: true }
  | { ok: false; duplicate: true }
  | { ok: false; duplicate: false; error: string };

export async function beginDriverAction(
  input: BeginDriverActionInput,
): Promise<BeginResult> {
  try {
    const { error } = await (supabase as any).from("driver_action_queue").insert({
      client_action_id: input.clientActionId,
      driver_id: input.driverId,
      equipment_id: input.equipmentId,
      action: input.action,
      payload: (input.payload as any) ?? null,
      status: "pending",
      is_online:
        input.isOnline ??
        (typeof navigator !== "undefined" ? navigator.onLine : null),
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : null,
    });
    if (error) {
      // 23505 = unique_violation → clique duplicado / retry duplicado
      if ((error as any).code === "23505") {
        return { ok: false, duplicate: true };
      }
      return { ok: false, duplicate: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    return { ok: false, duplicate: false, error: e?.message || String(e) };
  }
}

export async function commitDriverAction(clientActionId: string): Promise<void> {
  try {
    await (supabase as any)
      .from("driver_action_queue")
      .update({ status: "committed" })
      .eq("client_action_id", clientActionId);
  } catch (e) {
    console.warn("[driverActionQueue] commit failed", e);
  }
}

export async function failDriverAction(
  clientActionId: string,
  error: string,
): Promise<void> {
  try {
    await (supabase as any)
      .from("driver_action_queue")
      .update({ status: "failed", error })
      .eq("client_action_id", clientActionId);
  } catch (e) {
    console.warn("[driverActionQueue] fail update failed", e);
  }
}

export function newClientActionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // Fallback minimal (não deve ocorrer em navegadores modernos)
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
