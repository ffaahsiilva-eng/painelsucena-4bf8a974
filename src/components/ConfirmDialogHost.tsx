import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { subscribeConfirmDialog } from "@/lib/pendingConfirm";

/**
 * Host único do diálogo de confirmação usado por `confirmOnce`.
 * Exibe "Enviando…" com botões desabilitados enquanto a ação processa,
 * deixando claro ao motorista que o reenvio acontece uma única vez.
 */
export function ConfirmDialogHost() {
  const [state, setState] = useState({
    open: false,
    message: "",
    sending: false,
    onConfirm: () => {},
    onCancel: () => {},
  });

  useEffect(() => subscribeConfirmDialog(setState), []);

  return (
    <AlertDialog
      open={state.open}
      onOpenChange={(o) => {
        if (!o && !state.sending) state.onCancel();
      }}
    >
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>
            {state.sending ? "Enviando…" : "Confirmar ação"}
          </AlertDialogTitle>
          <AlertDialogDescription className="flex items-start gap-2">
            {state.sending && (
              <Loader2 className="h-4 w-4 animate-spin shrink-0 mt-0.5" />
            )}
            <span>
              {state.sending
                ? "Processando o envio. Aguarde — esta ação é enviada apenas uma vez."
                : state.message}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            disabled={state.sending}
            onClick={(e) => {
              if (state.sending) {
                e.preventDefault();
                return;
              }
              state.onCancel();
            }}
          >
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction
            disabled={state.sending}
            onClick={(e) => {
              e.preventDefault();
              if (state.sending) return;
              state.onConfirm();
            }}
          >
            {state.sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando…
              </>
            ) : (
              "Confirmar"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
