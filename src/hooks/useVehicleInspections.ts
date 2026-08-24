import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VehicleInspectionDocument {
  url: string;
  name: string;
  type: string;
}

export interface VehicleInspection {
  id: string;
  placa: string;
  modelo_veiculo: string;
  numero_cracha: string;
  vistoria: string | null;
  laudo_opacidade: string | null;
  laudo_mecanico: string | null;
  plano_manutencao: string | null;
  cronografo: string | null;
  documents: Record<string, VehicleInspectionDocument> | null;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export const DATE_FIELDS = [
  { key: "laudo_opacidade", label: "Laudo Opacidade" },
  { key: "laudo_mecanico", label: "Laudo Mecânico" },
  { key: "plano_manutencao", label: "Plano Manutenção" },
  { key: "cronografo", label: "Tacógrafo" },
] as const;

export type DateFieldKey = typeof DATE_FIELDS[number]["key"];

export function useVehicleInspections() {
  return useQuery({
    queryKey: ["vehicle-inspections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select("id, placa, modelo_veiculo, numero_cracha, vistoria, laudo_opacidade, laudo_mecanico, plano_manutencao, cronografo")
        .order("placa", { ascending: true });

      if (error) throw error;
      return data as VehicleInspection[];
    },
  });
}

export function useCreateVehicleInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      inspection: Partial<Omit<VehicleInspection, "id" | "created_at" | "updated_at">> & { placa: string; modelo_veiculo: string; numero_cracha: string; created_by: string }
    ) => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .insert(inspection)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    },
  });
}

export function useUpdateVehicleInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: {
      id: string;
      placa?: string;
      modelo_veiculo?: string;
      numero_cracha?: string;
      vistoria?: string | null;
      laudo_opacidade?: string | null;
      laudo_mecanico?: string | null;
      plano_manutencao?: string | null;
      cronografo?: string | null;
      documents?: Record<string, VehicleInspectionDocument> | null;
    }) => {
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    },
  });
}

export function useDeleteVehicleInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vehicle_inspections")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicle-inspections"] });
    },
  });
}
