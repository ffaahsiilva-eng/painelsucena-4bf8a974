import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SlingColor = "red" | "blue" | "yellow" | "green";
export type InspectionStatus = "pending" | "inspected" | "cancelled";

export interface SlingEquipment {
  id: string;
  tag: string;
  description: string;
  color: SlingColor;
  created_at: string;
  updated_at: string;
  created_by: string;
}

export interface SlingInspection {
  id: string;
  sling_id: string;
  inspection_date: string;
  status: InspectionStatus;
  inspected_by: string | null;
  inspected_at: string | null;
  notes: string | null;
  photo_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface SlingWithInspection extends SlingEquipment {
  currentInspection?: SlingInspection;
}

// Color to month mapping (same as ForbiddenColorIndicator)
export const colorMonthMap: Record<number, SlingColor> = {
  1: "red",    // Janeiro
  2: "blue",   // Fevereiro
  3: "yellow", // Março
  4: "green",  // Abril
  5: "red",    // Maio
  6: "blue",   // Junho
  7: "yellow", // Julho
  8: "green",  // Agosto
  9: "red",    // Setembro
  10: "blue",  // Outubro
  11: "yellow", // Novembro
  12: "green", // Dezembro
};

export const colorLabels: Record<SlingColor, string> = {
  red: "Vermelho",
  blue: "Azul",
  yellow: "Amarelo",
  green: "Verde",
};

export const colorClasses: Record<SlingColor, string> = {
  red: "bg-red-500",
  blue: "bg-blue-500",
  yellow: "bg-yellow-500",
  green: "bg-green-500",
};

export function getCurrentMonthColor(): SlingColor {
  const month = new Date().getMonth() + 1;
  return colorMonthMap[month];
}

export function getInspectionDate(color: SlingColor): Date {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  
  // Find next month that matches this color
  for (let i = 0; i < 12; i++) {
    const month = ((currentMonth - 1 + i) % 12) + 1;
    const year = currentYear + Math.floor((currentMonth - 1 + i) / 12);
    
    if (colorMonthMap[month] === color) {
      return new Date(year, month - 1, 1); // First day of that month
    }
  }
  
  return new Date();
}

export function useSlingEquipment() {
  return useQuery({
    queryKey: ["sling-equipment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sling_equipment")
        .select("*")
        .order("tag", { ascending: true });

      if (error) throw error;
      return data as SlingEquipment[];
    },
  });
}

export function useSlingInspections(monthYear?: string) {
  return useQuery({
    queryKey: ["sling-inspections", monthYear],
    queryFn: async () => {
      let query = supabase
        .from("sling_inspections")
        .select("*")
        .order("inspection_date", { ascending: false });

      if (monthYear) {
        const [year, month] = monthYear.split("-");
        const startDate = `${year}-${month}-01`;
        const endDate = new Date(parseInt(year), parseInt(month), 0).toISOString().split("T")[0];
        query = query.gte("inspection_date", startDate).lte("inspection_date", endDate);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SlingInspection[];
    },
  });
}

export function useSlingWithInspections() {
  const { data: slings, isLoading: slingsLoading } = useSlingEquipment();
  const { data: inspections, isLoading: inspectionsLoading } = useSlingInspections();

  const currentMonthColor = getCurrentMonthColor();
  const now = new Date();
  const currentMonthYear = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const slingsWithInspections: SlingWithInspection[] = (slings || []).map((sling) => {
    const currentInspection = inspections?.find(
      (i) => i.sling_id === sling.id && i.inspection_date.startsWith(currentMonthYear)
    );
    return { ...sling, currentInspection };
  });

  const pendingInspections = slingsWithInspections.filter(
    (s) => s.color === currentMonthColor && (!s.currentInspection || s.currentInspection.status === "pending")
  );

  return {
    slings: slingsWithInspections,
    pendingInspections,
    currentMonthColor,
    isLoading: slingsLoading || inspectionsLoading,
  };
}

export function useCreateSlingInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sling_id,
      inspection_date,
      status,
      inspected_by,
      notes,
      photo_url,
    }: {
      sling_id: string;
      inspection_date: string;
      status: InspectionStatus;
      inspected_by?: string;
      notes?: string;
      photo_url?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("sling_inspections")
        .insert({
          sling_id,
          inspection_date,
          status,
          inspected_by: inspected_by || null,
          inspected_at: status !== "pending" ? new Date().toISOString() : null,
          notes: notes || null,
          photo_url: photo_url ?? null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sling-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["sling-inspection-history"] });
    },
  });
}

export function useUpdateSlingInspection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      status,
      inspected_by,
      notes,
      photo_url,
      inspected_at,
    }: {
      id: string;
      status?: InspectionStatus;
      inspected_by?: string;
      notes?: string;
      photo_url?: string | null;
      inspected_at?: string | null;
    }) => {
      const payload: Record<string, unknown> = {};
      if (status !== undefined) {
        payload.status = status;
        payload.inspected_at =
          inspected_at !== undefined
            ? inspected_at
            : status !== "pending"
            ? new Date().toISOString()
            : null;
      } else if (inspected_at !== undefined) {
        payload.inspected_at = inspected_at;
      }
      if (inspected_by !== undefined) payload.inspected_by = inspected_by || null;
      if (notes !== undefined) payload.notes = notes || null;
      if (photo_url !== undefined) payload.photo_url = photo_url;

      const { data, error } = await supabase
        .from("sling_inspections")
        .update(payload)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sling-inspections"] });
      queryClient.invalidateQueries({ queryKey: ["sling-inspection-history"] });
    },
  });
}

export function useCreateSlingEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      tag,
      description,
      color,
      created_by,
    }: {
      tag: string;
      description: string;
      color: SlingColor;
      created_by: string;
    }) => {
      const { data, error } = await supabase
        .from("sling_equipment")
        .insert({ tag, description, color, created_by })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sling-equipment"] });
    },
  });
}

export function useDeleteSlingEquipment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("sling_equipment")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sling-equipment"] });
    },
  });
}
