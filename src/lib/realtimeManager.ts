/**
 * Realtime multiplexer singleton.
 *
 * Pools `supabase.channel(...).on('postgres_changes', ...)` subscriptions so
 * multiple hooks/components listening to the same (schema, table, event, filter)
 * share a single underlying channel. Reference-counted: the channel is only
 * removed when the last subscriber unsubscribes.
 *
 * Usage:
 *   useEffect(() => subscribeToTable(
 *     { event: 'INSERT', schema: 'public', table: 'chat_messages' },
 *     (payload) => { ... }
 *   ), [deps]);
 */
import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimePostgresChangesPayload<T> = {
  schema: string;
  table: string;
  commit_timestamp: string;
  eventType: "INSERT" | "UPDATE" | "DELETE";
  new: T;
  old: Partial<T>;
  errors: string[] | null;
};

export type PostgresEvent = "INSERT" | "UPDATE" | "DELETE" | "*";

export interface PostgresSubscribeConfig {
  event: PostgresEvent;
  schema?: string;
  table: string;
  filter?: string;
}

type Callback = (payload: RealtimePostgresChangesPayload<any>) => void;

interface PoolEntry {
  channel: RealtimeChannel;
  callbacks: Set<Callback>;
}

const pool = new Map<string, PoolEntry>();

const keyOf = (cfg: PostgresSubscribeConfig) =>
  `${cfg.schema ?? "public"}:${cfg.table}:${cfg.event}:${cfg.filter ?? ""}`;

export function subscribeToTable(
  cfg: PostgresSubscribeConfig,
  callback: Callback
): () => void {
  const key = keyOf(cfg);
  let entry = pool.get(key);

  if (!entry) {
    const callbacks = new Set<Callback>();
    const channel = supabase.channel(`rtm:${key}`);
    channel.on(
      "postgres_changes" as any,
      {
        event: cfg.event,
        schema: cfg.schema ?? "public",
        table: cfg.table,
        ...(cfg.filter ? { filter: cfg.filter } : {}),
      },
      (payload: RealtimePostgresChangesPayload<any>) => {
        callbacks.forEach((cb) => {
          try {
            cb(payload);
          } catch (err) {
            console.error("[realtimeManager] callback error", err);
          }
        });
      }
    );
    channel.subscribe();
    entry = { channel, callbacks };
    pool.set(key, entry);
  }

  entry.callbacks.add(callback);

  return () => {
    const current = pool.get(key);
    if (!current) return;
    current.callbacks.delete(callback);
    if (current.callbacks.size === 0) {
      supabase.removeChannel(current.channel);
      pool.delete(key);
    }
  };
}

/**
 * Subscribe to multiple postgres_changes configs at once. Returns a single
 * unsubscribe function that tears down all of them.
 */
export function subscribeToTables(
  configs: Array<{ cfg: PostgresSubscribeConfig; callback: Callback }>
): () => void {
  const disposers = configs.map(({ cfg, callback }) => subscribeToTable(cfg, callback));
  return () => disposers.forEach((d) => d());
}
