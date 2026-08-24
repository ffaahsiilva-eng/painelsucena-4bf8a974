import { useState, useEffect, useMemo } from "react";
import { useMatrixProgress } from "./useMatrixProgress";
import { useProfile } from "./useProfile";
import { useIsAdmin } from "./useUserRole";
import { useMatrixCustomTasks } from "./useMatrixCustomTasks";
import { useMatrixHiddenTasks } from "./useMatrixHiddenTasks";
import { getBrazilNorthTodayString } from "@/lib/timezone";

interface CargoTarefaSimple {
  id: string;
}

// key = cargoType (matches profile.cargo); folderId = id used for custom/hidden task mapping
const cargoTaskMap: Record<string, { cargo: string; folderId: string; tarefas: CargoTarefaSimple[] }> = {
  preposto: { cargo: "Preposto", folderId: "preposto", tarefas: [{ id: "p1" }, { id: "p2" }, { id: "p3" }, { id: "p4" }, { id: "p5" }] },
  encarregado_geral: { cargo: "Encarregado Geral", folderId: "encarregado-geral", tarefas: [{ id: "eg1" }, { id: "eg2" }, { id: "eg3" }] },
  encarregado_i: { cargo: "Encarregado I", folderId: "encarregado-i", tarefas: [{ id: "e1-1" }, { id: "e1-2" }, { id: "e1-3" }] },
  encarregado_ii: { cargo: "Encarregado II", folderId: "encarregado-ii", tarefas: [{ id: "e2-1" }, { id: "e2-2" }, { id: "e2-3" }] },
  tecnico_seguranca_i: { cargo: "Téc. Segurança I", folderId: "tecnico-seguranca-i", tarefas: [{ id: "ts1-1" }, { id: "ts1-2" }, { id: "ts1-3" }, { id: "ts1-4" }, { id: "ts1-5" }, { id: "ts1-6" }] },
  tecnico_seguranca_ii: { cargo: "Téc. Segurança II", folderId: "tecnico-seguranca-ii", tarefas: [{ id: "ts2-1" }, { id: "ts2-2" }, { id: "ts2-3" }, { id: "ts2-4" }, { id: "ts2-5" }, { id: "ts2-6" }] },
};

const LAST_DAY_MATRIX_KEY = "matrix_lastday_shown";

export const useLastDayMatrixCheck = () => {
  const { completedTasks, isLoading: matrixLoading } = useMatrixProgress();
  const { data: profile, isLoading: profileLoading } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { tasks: customTasks } = useMatrixCustomTasks();
  const { hiddenIds } = useMatrixHiddenTasks();
  const [showCelebration, setShowCelebration] = useState(false);
  const [showReminder, setShowReminder] = useState(false);

  const isLastDayOfMonth = useMemo(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return today.getDate() === lastDay;
  }, []);

  const userCargo = profile?.cargo as string | undefined;
  const cargoInfo = userCargo ? cargoTaskMap[userCargo] : null;

  // Resolve effective task list per cargo (base - hidden + custom)
  const resolvedTasksByKey = useMemo(() => {
    const hidden = new Set(hiddenIds);
    const out: Record<string, { id: string }[]> = {};
    Object.entries(cargoTaskMap).forEach(([key, info]) => {
      const base = info.tarefas.filter((t) => !hidden.has(t.id));
      const custom = customTasks
        .filter((ct) => ct.cargo_id === info.folderId)
        .map((ct) => ({ id: ct.id }));
      out[key] = [...base, ...custom];
    });
    return out;
  }, [customTasks, hiddenIds]);

  const progress = useMemo(() => {
    if (!cargoInfo || !userCargo) return 0;
    const tarefas = resolvedTasksByKey[userCargo] || [];
    if (tarefas.length === 0) return 100;
    const completed = tarefas.filter((t) => completedTasks.includes(t.id)).length;
    return Math.round((completed / tarefas.length) * 100);
  }, [cargoInfo, userCargo, resolvedTasksByKey, completedTasks]);

  // Dias restantes até o fim do mês (inclusive o último dia)
  const daysUntilMonthEnd = useMemo(() => {
    const today = new Date();
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    return Math.max(0, lastDay - today.getDate());
  }, []);

  const currentMonthName = useMemo(() => {
    return new Date().toLocaleString("pt-BR", { month: "long" });
  }, []);

  // Lista de cargos com matriz pendente
  const pendingCargos = useMemo(() => {
    const shortLabels: Record<string, string> = {
      preposto: "Preposto",
      encarregado_geral: "Enc. Geral",
      encarregado_i: "Enc. I",
      encarregado_ii: "Enc. II",
      tecnico_seguranca_i: "Téc. Seg. I",
      tecnico_seguranca_ii: "Téc. Seg. II",
    };
    return Object.entries(cargoTaskMap).map(([key, info]) => {
      const tarefas = resolvedTasksByKey[key] || [];
      const done = tarefas.filter((t) => completedTasks.includes(t.id)).length;
      return {
        key,
        label: shortLabels[key] ?? info.cargo,
        cargo: info.cargo,
        done,
        total: tarefas.length,
      };
    }).filter((c) => c.total > 0 && c.done < c.total);
  }, [completedTasks, resolvedTasksByKey]);

  // Mostrar nos últimos 3 dias do mês (faltando 0, 1, 2 ou 3 dias)
  const isReminderWindow = daysUntilMonthEnd <= 3;

  useEffect(() => {
    if (matrixLoading || profileLoading || !isReminderWindow || !cargoInfo) return;
    if (isAdmin) return;

    const today = getBrazilNorthTodayString();
    const shownKey = localStorage.getItem(LAST_DAY_MATRIX_KEY);

    if (isLastDayOfMonth && progress === 100) {
      // Celebração apenas no último dia se 100%
      if (shownKey !== `${today}_celebration`) {
        localStorage.setItem(LAST_DAY_MATRIX_KEY, `${today}_celebration`);
        setShowCelebration(true);
      }
    } else if (pendingCargos.length > 0) {
      // Lembrete uma vez por dia
      if (shownKey !== today && shownKey !== `${today}_celebration`) {
        localStorage.setItem(LAST_DAY_MATRIX_KEY, today);
        setShowReminder(true);
      }
    }
  }, [matrixLoading, profileLoading, isReminderWindow, isLastDayOfMonth, cargoInfo, progress, isAdmin, pendingCargos.length]);

  return {
    showCelebration,
    showReminder,
    setShowCelebration,
    setShowReminder,
    cargoName: cargoInfo?.cargo || "",
    progress,
    userName: profile?.full_name,
    userAvatarUrl: profile?.avatar_url,
    daysUntilMonthEnd,
    currentMonthName,
    pendingCargos,
  };
};
