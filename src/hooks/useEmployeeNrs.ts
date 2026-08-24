import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EmployeeNr {
  id: string;
  employee_id: string;
  nr_name: string;
  completion_date: string | null;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export const useEmployeeNrs = (employeeId?: string) => {
  return useQuery({
    queryKey: ["employee-nrs", employeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_nrs")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("nr_name");
      if (error) throw error;
      return data as EmployeeNr[];
    },
    enabled: !!employeeId,
  });
};

export const useAllEmployeeNrs = () => {
  return useQuery({
    queryKey: ["all-employee-nrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_nrs")
        .select("*")
        .order("expiry_date");
      if (error) throw error;
      return data as EmployeeNr[];
    },
  });
};

export const useUpsertEmployeeNrs = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      employeeId,
      nrs,
    }: {
      employeeId: string;
      nrs: { nr_name: string; completion_date: string | null; expiry_date: string | null }[];
    }) => {
      // Delete existing NRs for this employee
      await supabase.from("employee_nrs").delete().eq("employee_id", employeeId);

      if (nrs.length === 0) return;

      const rows = nrs.map((nr) => ({
        employee_id: employeeId,
        nr_name: nr.nr_name,
        completion_date: nr.completion_date || null,
        expiry_date: nr.expiry_date || null,
      }));

      const { error } = await supabase.from("employee_nrs").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee-nrs"] });
      queryClient.invalidateQueries({ queryKey: ["all-employee-nrs"] });
    },
  });
};
