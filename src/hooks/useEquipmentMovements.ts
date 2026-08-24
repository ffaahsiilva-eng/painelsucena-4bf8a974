import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getBrazilNorthTodayString, getBrazilNorthTimeString } from "@/lib/timezone";
import { startOfMonth, endOfMonth, format } from "date-fns";

export type MovementType = "entrada" | "saida";
export type ExitReason = "manutencao_corretiva" | "manutencao_preventiva" | "vistoria" | "operando" | "aguardando_frente_servico" | "fim_turno";

export interface EquipmentMovement {
  id: string;
  equipment_name: string;
  plate: string;
  movement_type: MovementType;
  movement_date: string;
  movement_time: string;
  exit_reason: ExitReason | null;
  problem_description: string | null;
  observation: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface EquipmentMovementInsert {
  equipment_name: string;
  plate: string;
  movement_type: MovementType;
  movement_date?: string;
  movement_time?: string;
  exit_reason?: ExitReason | null;
  problem_description?: string | null;
  observation?: string | null;
  environment?: string;
}

export function useEquipmentMovements(date?: string) {
  const targetDate = date || getBrazilNorthTodayString();

  return useQuery({
    queryKey: ["equipment-movements", targetDate],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("id, equipment_name, plate, movement_type, movement_date, movement_time, exit_reason, problem_description, observation, created_by")
        .eq("movement_date", targetDate)
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    staleTime: 1000 * 60 * 2, // 2 min cache
  });
}

export function useAllEquipmentMovements() {
  return useQuery({
    queryKey: ["equipment-movements-all"],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("id, equipment_name, plate, movement_type, movement_date, movement_time, exit_reason")
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false })
        .limit(100);

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

export function useRecentMovements(limit = 10) {
  return useQuery({
    queryKey: ["equipment-movements-recent", limit],
    queryFn: async (): Promise<(EquipmentMovement & { previous_movement?: EquipmentMovement })[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("id, equipment_name, plate, movement_type, movement_date, movement_time, exit_reason")
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false })
        .limit(limit);

      if (error) throw error;
      const movements = (data || []) as EquipmentMovement[];

      // For each movement, if it's an "entrada", try to find the "saida" just before it
      const movementsWithContext = await Promise.all(
        movements.map(async (m) => {
          if (m.movement_type === "entrada") {
            const { data: prev } = await supabase
              .from("equipment_movements")
              .select("*")
              .eq("plate", m.plate)
              .eq("movement_type", "saida")
              // It must be chronologically before the current movement
              .or(`movement_date.lt.${m.movement_date},and(movement_date.eq.${m.movement_date},movement_time.lt.${m.movement_time})`)
              .order("movement_date", { ascending: false })
              .order("movement_time", { ascending: false })
              .limit(1)
              .maybeSingle();
            
            return { ...m, previous_movement: prev || undefined };
          }
          return m;
        })
      );

      return movementsWithContext;
    },
    staleTime: 1000 * 30, // 30 seconds
  });
}

// Get all entries ever recorded
export function useAllEntries() {
  return useQuery({
    queryKey: ["equipment-movements-all-entries"],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("id, equipment_name, plate, movement_type, movement_date, movement_time")
        .eq("movement_type", "entrada")
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Get equipment currently out (saida without a subsequent entrada)
export function useEquipmentCurrentlyOut() {
  return useQuery({
    queryKey: ["equipment-movements-currently-out"],
    queryFn: async () => {
      // Order by created_at so equipment status reflects what was actually
      // registered last (in registration order), not by the movement_date/time
      // fields which the user may set in the past.
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("id, equipment_name, plate, movement_type, movement_date, movement_time, exit_reason")
        .order("created_at", { ascending: true });

      if (error) throw error;

      const movements = (data || []) as EquipmentMovement[];

      // Track last registered movement per equipment (by plate)
      const lastMovementByPlate: Record<string, EquipmentMovement> = {};
      movements.forEach((m) => {
        lastMovementByPlate[m.plate] = m;
      });

      // Filter only those whose last movement was "saida"
      const currentlyOut = Object.values(lastMovementByPlate).filter(
        (m) => m.movement_type === "saida"
      );

      // Sort by exit date (most recent first)
      return currentlyOut.sort((a, b) => {
        const dateCompare = b.movement_date.localeCompare(a.movement_date);
        if (dateCompare !== 0) return dateCompare;
        return b.movement_time.localeCompare(a.movement_time);
      });
    },
    staleTime: 1000 * 60 * 2,
  });
}

const EXIT_REASON_LABELS: Record<ExitReason, string> = {
  manutencao_corretiva: "Manutenção Corretiva",
  manutencao_preventiva: "Manutenção Preventiva",
  vistoria: "Vistoria",
  operando: "Operando",
  aguardando_frente_servico: "Aguardando Frente de Serviço",
  fim_turno: "Fim de Turno",
};

export function useCreateEquipmentMovement() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (movement: EquipmentMovementInsert) => {
      if (!user?.id) throw new Error("User not authenticated");

      // Get user profile to check for environment
      const { data: profileData } = await supabase
        .from("profiles")
        .select("environment")
        .eq("user_id", user.id)
        .maybeSingle();

      const userEnvironment = profileData?.environment || "barcarena";
      const movementEnvironment = movement.environment || userEnvironment;

      const today = getBrazilNorthTodayString();
      const movementDate = movement.movement_date || today;
      const movementTime = movement.movement_time || getBrazilNorthTimeString();

      const { data, error } = await supabase
        .from("equipment_movements")
        .insert({
          ...movement,
          movement_date: movementDate,
          movement_time: movementTime,
          environment: movementEnvironment,
          created_by: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Tudo abaixo é "best-effort": o movimento principal já foi registrado.
      // Qualquer falha em side-effects (sync de status, histórico, anúncio,
      // notificação WhatsApp) NÃO deve disparar o toast de erro nem fazer o
      // usuário reenviar o mesmo movimento (causava duplicatas).
      try {
        // Sync equipment status based on the CHRONOLOGICALLY LATEST movement
        // for this plate (regardless of when it was registered). This way, registering
        // a movement with a past date will only affect live status if it is still the
        // most recent movement; otherwise the status keeps reflecting the latest record.
        const { data: allPlateMovements } = await supabase
          .from("equipment_movements")
          .select("*")
          .eq("plate", movement.plate)
          .order("movement_date", { ascending: false })
          .order("movement_time", { ascending: false })
          .limit(1);

        const latestMovement = (allPlateMovements?.[0] as EquipmentMovement | undefined);

        if (latestMovement) {
          const { data: eqData } = await supabase
            .from("equipment")
            .select("id")
            .eq("plate", movement.plate)
            .maybeSingle();

          if (eqData) {
            const latestIso = new Date(`${latestMovement.movement_date}T${latestMovement.movement_time}:00`).toISOString();

            if (latestMovement.movement_type === "saida") {
              const statusMap: Record<string, string> = {
                manutencao_corretiva: "manutencao_corretiva",
                manutencao_preventiva: "manutencao_preventiva",
                vistoria: "vistoria",
                fim_turno: "end_of_shift",
              };
              const newStopReason = latestMovement.exit_reason
                ? statusMap[latestMovement.exit_reason] || "end_of_shift"
                : "end_of_shift";

              await supabase
                .from("equipment")
                .update({
                  stop_reason: newStopReason,
                  stop_start_time: latestIso,
                })
                .eq("id", eqData.id);

              // Only manage stop_history when the inserted movement is the latest one
              if (latestMovement.id === data.id) {
                const { data: openStop } = await supabase
                  .from("equipment_stop_history")
                  .select("id, started_at")
                  .eq("equipment_id", eqData.id)
                  .is("ended_at", null)
                  .order("started_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (openStop) {
                  const durationMinutes = Math.round(
                    (new Date(latestIso).getTime() - new Date(openStop.started_at).getTime()) / 60000
                  );
                  await supabase
                    .from("equipment_stop_history")
                    .update({ ended_at: latestIso, duration_minutes: durationMinutes })
                    .eq("id", openStop.id);
                }

                await supabase
                  .from("equipment_stop_history")
                  .insert({
                    equipment_id: eqData.id,
                    stop_reason: newStopReason,
                    started_at: latestIso,
                    defect_description: latestMovement.problem_description || null,
                    changed_by_driver: user.id,
                    environment: movementEnvironment,
                  });
              }
            } else if (latestMovement.movement_type === "entrada") {
              await supabase
                .from("equipment")
                .update({
                  stop_reason: "none",
                  stop_start_time: null,
                })
                .eq("id", eqData.id);

              if (latestMovement.id === data.id) {
                const { data: openStop } = await supabase
                  .from("equipment_stop_history")
                  .select("id, started_at")
                  .eq("equipment_id", eqData.id)
                  .is("ended_at", null)
                  .order("started_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();

                if (openStop) {
                  const durationMinutes = Math.round(
                    (new Date(latestIso).getTime() - new Date(openStop.started_at).getTime()) / 60000
                  );
                  await supabase
                    .from("equipment_stop_history")
                    .update({ ended_at: latestIso, duration_minutes: durationMinutes })
                    .eq("id", openStop.id);
                }
              }
            }
          }
        }

        // If the movement is for today, create an announcement for all users
        if (movementDate === today) {
          const isEntrada = movement.movement_type === "entrada";
          const movementTypeLabel = isEntrada ? "ENTRADA" : "SAÍDA";
          const emoji = isEntrada ? "🟢" : "🔴";
          
          let title = `${emoji} ${movementTypeLabel} de Equipamento`;
          let content = `**${movement.equipment_name}** (${movement.plate}) registrou ${isEntrada ? "entrada" : "saída"} hoje.`;
          
          if (!isEntrada && movement.exit_reason) {
            const reasonLabel = EXIT_REASON_LABELS[movement.exit_reason];
            content += `\n\n**Motivo:** ${reasonLabel}`;
            
            if (movement.problem_description) {
              content += `\n**Descrição:** ${movement.problem_description}`;
            }
          }
          
          if (movement.observation) {
            content += `\n\n**Observação:** ${movement.observation}`;
          }

          // Create announcement for all users
          await supabase
            .from("announcements")
            .insert({
              title,
              content,
              created_by: user.id,
              target_type: "all",
              published_at: new Date().toISOString(),
              environment: movementEnvironment,
            });
        }

        // Auto WhatsApp para grupo configurado (fire-and-forget)
        if (data?.id) {
          supabase.functions.invoke("wapi-equipment-movement-notify", {
            body: { movementId: data.id },
          }).catch((e) => console.warn("[wapi-equipment-movement-notify] falhou:", e));
        }
      } catch (sideEffectError) {
        console.warn("[createMovement] side-effect falhou (movimento já registrado):", sideEffectError);
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-movements"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all-entries"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-out"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-in"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-weekly"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-summary"] });
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      queryClient.invalidateQueries({ queryKey: ["equipment"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
      toast.success("Movimento registrado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating movement:", error);
      toast.error("Erro ao registrar movimento");
    },
  });
}

export function useUpdateEquipmentMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, movement_date, movement_time }: { id: string; movement_date: string; movement_time: string }) => {
      const { error } = await supabase
        .from("equipment_movements")
        .update({ movement_date, movement_time })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-movements"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all-entries"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-out"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-in"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-weekly"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-summary"] });
      toast.success("Movimentação atualizada!");
    },
    onError: (error) => {
      console.error("Error updating movement:", error);
      toast.error("Erro ao atualizar movimentação");
    },
  });
}

export function useDeleteEquipmentMovement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("equipment_movements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["equipment-movements"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-all-entries"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-out"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-currently-in"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-weekly"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-movements-summary"] });
      toast.success("Movimento excluído!");
    },
    onError: (error) => {
      console.error("Error deleting movement:", error);
      toast.error("Erro ao excluir movimento");
    },
  });
}

export function useTodayMovementsSummary() {
  const today = getBrazilNorthTodayString();

  return useQuery({
    queryKey: ["equipment-movements-summary", today],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("movement_type")
        .eq("movement_date", today);

      if (error) throw error;

      const movements = data || [];
      const entradas = movements.filter((m) => m.movement_type === "entrada").length;
      const saidas = movements.filter((m) => m.movement_type === "saida").length;

      return {
        entradas,
        saidas,
        noCanteiro: entradas - saidas,
      };
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Get equipment currently in the yard (entrada without subsequent saida)
export function useEquipmentCurrentlyIn() {
  return useQuery({
    queryKey: ["equipment-movements-currently-in"],
    queryFn: async () => {
      // Get all movements ordered by date and time
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      if (error) throw error;

      const movements = (data || []) as EquipmentMovement[];
      
      // Track last movement per equipment (by plate)
      const lastMovementByPlate: Record<string, EquipmentMovement> = {};
      
      movements.forEach((m) => {
        lastMovementByPlate[m.plate] = m;
      });
      
      // Filter only those whose last movement was "entrada"
      const currentlyIn = Object.values(lastMovementByPlate).filter(
        (m) => m.movement_type === "entrada"
      );
      
      // Sort by entry date (most recent first)
      return currentlyIn.sort((a, b) => {
        const dateCompare = b.movement_date.localeCompare(a.movement_date);
        if (dateCompare !== 0) return dateCompare;
        return b.movement_time.localeCompare(a.movement_time);
      });
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Get equipment currently out as of a specific date (for RDO past date support)
export function useEquipmentOutByDate(date: string) {
  return useQuery({
    queryKey: ["equipment-movements-out-by-date", date],
    queryFn: async () => {
      // Get all movements up to and including the given date
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .lte("movement_date", date)
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      if (error) throw error;

      const movements = (data || []) as EquipmentMovement[];
      
      // Track last movement per equipment (by plate) up to that date
      const lastMovementByPlate: Record<string, EquipmentMovement> = {};
      
      movements.forEach((m) => {
        lastMovementByPlate[m.plate] = m;
      });
      
      // Filter only those whose last movement was "saida"
      const currentlyOut = Object.values(lastMovementByPlate).filter(
        (m) => m.movement_type === "saida"
      );
      
      return currentlyOut.sort((a, b) => {
        const dateCompare = b.movement_date.localeCompare(a.movement_date);
        if (dateCompare !== 0) return dateCompare;
        return b.movement_time.localeCompare(a.movement_time);
      });
    },
    staleTime: 1000 * 60 * 2,
  });
}

// Get equipment currently in the yard as of a specific date (for RDO past date support)
export function useEquipmentInByDate(date: string) {
  return useQuery({
    queryKey: ["equipment-movements-in-by-date", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .lte("movement_date", date)
        .order("movement_date", { ascending: true })
        .order("movement_time", { ascending: true });

      if (error) throw error;

      const movements = (data || []) as EquipmentMovement[];
      const lastMovementByPlate: Record<string, EquipmentMovement> = {};
      movements.forEach((m) => {
        lastMovementByPlate[m.plate] = m;
      });

      const currentlyIn = Object.values(lastMovementByPlate).filter(
        (m) => m.movement_type === "entrada"
      );

      return currentlyIn.sort((a, b) => {
        const dateCompare = b.movement_date.localeCompare(a.movement_date);
        if (dateCompare !== 0) return dateCompare;
        return b.movement_time.localeCompare(a.movement_time);
      });
    },
    staleTime: 1000 * 60 * 2,
  });
}



export function useWeeklyEquipmentMovements(startDate: string, endDate: string) {
  return useQuery({
    queryKey: ["equipment-movements-weekly", startDate, endDate],
    queryFn: async (): Promise<EquipmentMovement[]> => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("*")
        .gte("movement_date", startDate)
        .lte("movement_date", endDate)
        .order("movement_date", { ascending: false })
        .order("movement_time", { ascending: false });

      if (error) throw error;
      return (data || []) as EquipmentMovement[];
    },
    enabled: !!startDate && !!endDate,
  });
}

export function useAllRegisteredEquipmentCount() {
  return useQuery({
    queryKey: ["equipment-movements-all-plates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("equipment_movements")
        .select("plate");

      if (error) throw error;

      const uniquePlates = new Set((data || []).map((m: { plate: string }) => m.plate));
      return uniquePlates.size;
    },
    staleTime: 1000 * 60 * 5,
  });
}
