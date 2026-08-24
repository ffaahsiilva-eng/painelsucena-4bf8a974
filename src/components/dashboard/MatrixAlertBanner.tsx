import { useEffect, useState } from "react";
import { format, endOfMonth, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronRight, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { getBrazilNorthDate, getBrazilNorthMonthYear } from "@/lib/timezone";

// Cargo definitions with their tasks (same as Matriz page)
const cargoDefinitions: Record<string, { cargo: string; folderId: string; tarefas: string[] }> = {
  preposto: { cargo: "Preposto", folderId: "preposto", tarefas: ["p1", "p2", "p3", "p4", "p5"] },
  encarregado_geral: { cargo: "Enc. Geral", folderId: "encarregado-geral", tarefas: ["eg1", "eg2", "eg3"] },
  encarregado_i: { cargo: "Enc. I", folderId: "encarregado-i", tarefas: ["e1-1", "e1-2", "e1-3"] },
  encarregado_ii: { cargo: "Enc. II", folderId: "encarregado-ii", tarefas: ["e2-1", "e2-2", "e2-3"] },
  tecnico_seguranca_i: { cargo: "Téc. Seg. I", folderId: "tecnico-seguranca-i", tarefas: ["ts1-1", "ts1-2", "ts1-3", "ts1-4", "ts1-5", "ts1-6"] },
  tecnico_seguranca_ii: { cargo: "Téc. Seg. II", folderId: "tecnico-seguranca-ii", tarefas: ["ts2-1", "ts2-2", "ts2-3", "ts2-4", "ts2-5", "ts2-6"] },
};

interface IncompleteUser {
  name: string;
  cargo: string;
  completedCount: number;
  totalTasks: number;
}

export function MatrixAlertBanner() {
  const [incompleteUsers, setIncompleteUsers] = useState<IncompleteUser[]>([]);
  const [showAlert, setShowAlert] = useState(false);
  const [daysRemaining, setDaysRemaining] = useState(0);

  useEffect(() => {
    const checkMatrixStatus = async () => {
      try {
        const today = getBrazilNorthDate();
        const endOfCurrentMonth = endOfMonth(today);
        const daysUntilEndOfMonth = differenceInDays(endOfCurrentMonth, today);
        
        setDaysRemaining(daysUntilEndOfMonth);

        // Only check if within 5 days of end of month
        if (daysUntilEndOfMonth > 5) {
          setShowAlert(false);
          return;
        }

        const monthYear = getBrazilNorthMonthYear();

        // Fetch task completions, custom tasks and hidden tasks in parallel
        const [completionsRes, customRes, hiddenRes] = await Promise.all([
          supabase.from("matrix_task_completions").select("task_id").eq("month_year", monthYear),
          supabase.from("matrix_custom_tasks").select("id, cargo_id"),
          supabase.from("matrix_hidden_tasks").select("task_id"),
        ]);

        if (completionsRes.error) throw completionsRes.error;

        const globallyCompletedTaskIds = new Set(completionsRes.data?.map((c) => c.task_id) || []);
        const hidden = new Set((hiddenRes.data || []).map((h: any) => h.task_id));
        const customByFolder: Record<string, string[]> = {};
        (customRes.data || []).forEach((ct: any) => {
          if (!customByFolder[ct.cargo_id]) customByFolder[ct.cargo_id] = [];
          customByFolder[ct.cargo_id].push(ct.id);
        });

        // Check each cargo's effective tasks against global completions
        const incomplete: IncompleteUser[] = [];

        Object.entries(cargoDefinitions).forEach(([, cargoConfig]) => {
          const effectiveTasks = [
            ...cargoConfig.tarefas.filter((t) => !hidden.has(t)),
            ...(customByFolder[cargoConfig.folderId] || []),
          ];
          if (effectiveTasks.length === 0) return;
          const completedCount = effectiveTasks.filter((taskId) =>
            globallyCompletedTaskIds.has(taskId)
          ).length;

          if (completedCount < effectiveTasks.length) {
            incomplete.push({
              name: cargoConfig.cargo,
              cargo: cargoConfig.cargo,
              completedCount,
              totalTasks: effectiveTasks.length,
            });
          }
        });

        // Sort by completion percentage (lowest first)
        incomplete.sort((a, b) =>
          (a.completedCount / a.totalTasks) - (b.completedCount / b.totalTasks)
        );

        setIncompleteUsers(incomplete);
        setShowAlert(incomplete.length > 0);
      } catch (error) {
        console.error("Error checking matrix status:", error);
      }
    };

    checkMatrixStatus();
  }, []);

  if (!showAlert) {
    return null;
  }

  const currentMonth = format(getBrazilNorthDate(), "MMMM", { locale: ptBR });

  return (
    <div className="mb-6 animate-fade-in">
      <Alert className="border-teal-500/60 bg-gradient-to-r from-teal-500/10 via-cyan-500/10 to-emerald-500/10 relative overflow-hidden shadow-[0_0_25px_-5px_rgba(20,184,166,0.35)] transition-all duration-500 hover:shadow-[0_0_35px_-5px_rgba(20,184,166,0.55)]">
        {/* Barra lateral pulsante */}
        <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-teal-400 via-cyan-500 to-emerald-500 animate-pulse" />

        {/* Brilho deslizante sutil */}
        <div className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/10 to-transparent animate-[shimmer_3.5s_ease-in-out_infinite]" />

        <div className="flex items-start gap-4 relative">
          <AlertTriangle className="h-6 w-6 text-teal-500 shrink-0 mt-0.5 animate-[wiggle_2.4s_ease-in-out_infinite]" />
          <div className="flex-1">
            <AlertTitle className="font-bold text-lg flex items-center gap-2 bg-gradient-to-r from-teal-600 via-cyan-600 to-emerald-600 dark:from-teal-300 dark:via-cyan-300 dark:to-emerald-300 bg-clip-text text-transparent">
              🚨 Atenção! {daysRemaining === 0 ? "Último dia" : `Faltam ${daysRemaining} dias`} para fechar {currentMonth}
            </AlertTitle>
            <AlertDescription className="text-teal-700 dark:text-teal-200/90 mt-2">
              <p className="mb-2">Usuários que ainda não concluíram a matriz:</p>
              <div className="flex flex-wrap gap-2">
                {incompleteUsers.map((user, index) => (
                  <div
                    key={index}
                    className="inline-flex items-center gap-1.5 bg-teal-500/15 hover:bg-teal-500/25 border border-teal-400/30 px-2.5 py-1 rounded-full text-sm transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
                    style={{ animation: `fadeInUp 0.4s ease-out ${index * 80}ms backwards` }}
                  >
                    <User className="w-3.5 h-3.5 text-teal-500 dark:text-teal-300" />
                    <span className="text-teal-800 dark:text-teal-100 font-semibold">{user.name}</span>
                    <span className="text-teal-600 dark:text-teal-300/80 text-xs">
                      ({user.cargo}: {user.completedCount}/{user.totalTasks})
                    </span>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </div>
          <Link
            to="/matriz"
            className="text-teal-500 hover:text-teal-400 transition-all shrink-0 hover:translate-x-1"
          >
            <ChevronRight className="w-5 h-5" />
          </Link>
        </div>
      </Alert>
    </div>
  );
}
