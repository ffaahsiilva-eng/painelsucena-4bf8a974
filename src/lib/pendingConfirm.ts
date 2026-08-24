/**
 * Confirmação com memória da última ação bloqueada + diálogo visual.
 *
 * - Lembra a última ação cancelada por chave (`key`) e reaproveita o mesmo
 *   `opId` quando o usuário tenta de novo, garantindo idempotência no replay
 *   offline-first (tabelas têm UNIQUE em `client_op_id`).
 * - Mostra um AlertDialog customizado com botões "Confirmar" e "Cancelar".
 * - Ao confirmar, mantém o diálogo aberto exibindo "Enviando…" com spinner e
 *   ambos os botões desabilitados, deixando claro que o reenvio é único.
 * - Bloqueia execuções concorrentes da mesma chave (clique repetido = ignorado).
 */

type Entry = { opId: string; inFlight: boolean };

const pending = new Map<string, Entry>();

type DialogState = {
  open: boolean;
  message: string;
  sending: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

type Listener = (state: DialogState) => void;

const initialState: DialogState = {
  open: false,
  message: "",
  sending: false,
  onConfirm: () => {},
  onCancel: () => {},
};

let currentState: DialogState = initialState;
const listeners = new Set<Listener>();

function setState(patch: Partial<DialogState>) {
  currentState = { ...currentState, ...patch };
  listeners.forEach((l) => l(currentState));
}

export function subscribeConfirmDialog(listener: Listener): () => void {
  listeners.add(listener);
  listener(currentState);
  return () => {
    listeners.delete(listener);
  };
}

function newOpId(): string {
  try {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return (crypto as Crypto).randomUUID();
    }
  } catch {}
  return `op_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

function askUser(message: string): Promise<boolean> {
  return new Promise((resolve) => {
    setState({
      open: true,
      message,
      sending: false,
      onConfirm: () => resolve(true),
      onCancel: () => {
        setState({ open: false, sending: false });
        resolve(false);
      },
    });
  });
}

export async function confirmOnce(
  key: string,
  message: string,
  run: (opId: string) => void | Promise<void>,
): Promise<boolean> {
  const existing = pending.get(key);
  if (existing?.inFlight) return false;

  const entry: Entry = existing ?? { opId: newOpId(), inFlight: false };
  pending.set(key, entry);

  const ok = await askUser(message);
  if (!ok) {
    // Mantém a entrada lembrada para reusar o mesmo opId na próxima tentativa.
    return false;
  }

  entry.inFlight = true;
  setState({ sending: true });
  try {
    await run(entry.opId);
    pending.delete(key);
    setState({ open: false, sending: false });
    return true;
  } catch (err) {
    // Mantém o opId para retry sem duplicar; libera o lock e fecha o diálogo.
    entry.inFlight = false;
    setState({ open: false, sending: false });
    throw err;
  }
}

export function clearPendingConfirm(key: string) {
  pending.delete(key);
}
