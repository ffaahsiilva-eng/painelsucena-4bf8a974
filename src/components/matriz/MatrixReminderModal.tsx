import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, AlertTriangle, ChevronRight, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PendingCargo {
  key: string;
  label: string;
  cargo: string;
  done: number;
  total: number;
}

interface MatrixReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  cargoName: string;
  progress: number;
  userName?: string;
  userAvatarUrl?: string;
  daysUntilMonthEnd?: number;
  currentMonthName?: string;
  pendingCargos?: PendingCargo[];
}

export function MatrixReminderModal({
  isOpen,
  onClose,
  daysUntilMonthEnd = 0,
  currentMonthName = "",
  pendingCargos = [],
}: MatrixReminderModalProps) {
  const navigate = useNavigate();

  const headline =
    daysUntilMonthEnd === 0
      ? `Hoje é o último dia de ${currentMonthName}`
      : daysUntilMonthEnd === 1
      ? `Falta 1 dia para fechar ${currentMonthName}`
      : `Faltam ${daysUntilMonthEnd} dias para fechar ${currentMonthName}`;

  const goToMatriz = () => {
    onClose();
    navigate("/matriz");
  };

  return (
    <Dialog open={isOpen} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-3xl border-none bg-transparent shadow-none overflow-visible p-0 [&>button]:hidden">
        {/* Card com borda gradiente teal */}
        <div
          className="relative w-full rounded-3xl p-[2px]"
          style={{
            background:
              "linear-gradient(135deg, #14b8a6 0%, #5eead4 35%, #99f6e4 60%, #14b8a6 100%)",
          }}
        >
          <div className="relative w-full rounded-[22px] bg-gradient-to-br from-white via-teal-50/40 to-emerald-50/30 dark:from-gray-900 dark:via-gray-900 dark:to-teal-950/40 p-6 md:p-7 shadow-2xl">
            {/* Botão fechar */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 z-20 w-8 h-8 rounded-full bg-white/80 hover:bg-white text-teal-600 flex items-center justify-center shadow-md transition-colors border border-teal-200/60"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Linha do título */}
            <div className="flex items-center gap-4 pr-10">
              {/* Ícone alerta triangular */}
              <div className="shrink-0">
                <AlertTriangle
                  className="w-12 h-12 md:w-14 md:h-14 text-teal-500"
                  strokeWidth={2}
                />
              </div>

              {/* Divisor vertical */}
              <div className="h-10 w-[2px] bg-gradient-to-b from-teal-300 to-teal-500/40 rounded-full" />

              {/* Título */}
              <button
                onClick={goToMatriz}
                className="flex-1 text-left flex items-center gap-3 group"
              >
                <h2 className="text-2xl md:text-[28px] font-extrabold tracking-tight">
                  <span className="text-slate-900 dark:text-white">Atenção! </span>
                  <span className="text-teal-600 dark:text-teal-400 font-semibold">
                    {headline}
                  </span>
                </h2>
                <ChevronRight className="w-6 h-6 text-teal-500 opacity-70 group-hover:translate-x-1 transition-transform shrink-0" />
              </button>
            </div>

            {/* Subtítulo */}
            <p className="mt-4 text-sm md:text-base text-slate-600 dark:text-slate-300">
              Usuários que ainda não concluíram a matriz:
            </p>

            {/* Pílulas de cargos pendentes */}
            <div className="mt-3 flex flex-wrap gap-2.5">
              {pendingCargos.length === 0 ? (
                <span className="text-sm text-slate-500 italic">
                  Todas as matrizes estão concluídas 🎉
                </span>
              ) : (
                pendingCargos.map((c) => (
                  <button
                    key={c.key}
                    onClick={goToMatriz}
                    className="group inline-flex items-center gap-2.5 pl-2 pr-4 py-1.5 rounded-full bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/60 dark:to-emerald-950/60 border border-teal-200/70 dark:border-teal-800/60 hover:from-teal-100 hover:to-emerald-100 dark:hover:from-teal-900/60 dark:hover:to-emerald-900/60 transition-colors shadow-sm"
                  >
                    <span className="w-7 h-7 rounded-full bg-white dark:bg-gray-800 border border-teal-200 dark:border-teal-800 flex items-center justify-center">
                      <User className="w-4 h-4 text-teal-600 dark:text-teal-400" strokeWidth={2.2} />
                    </span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      {c.label}
                    </span>
                    <span className="h-4 w-px bg-teal-300/70 dark:bg-teal-700/70" />
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      ({c.label}: {c.done}/{c.total})
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
