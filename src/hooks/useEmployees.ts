import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEnvironment } from "./useEnvironment";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Employee = Tables<"employees">;
export type EmployeeInsert = TablesInsert<"employees">;
export type EmployeeUpdate = TablesUpdate<"employees">;

export const useEmployees = () => {
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";

  return useQuery({
    queryKey: ["employees", currentEnv],
    queryFn: async () => {
      const batchSize = 1000;
      let from = 0;
      let hasMore = true;
      const allEmployees: Employee[] = [];

      while (hasMore) {
        const { data, error } = await supabase
          .from("employees")
          .select("id, name, avatar, cargo, status, environment, dataNascimento, dataASO, dataPT, dataTreinamento")
          .eq("environment", currentEnv)
          .order("name")
          .range(from, from + batchSize - 1);

        if (error) throw error;

        const batch = (data ?? []) as Employee[];
        allEmployees.push(...batch);

        hasMore = batch.length === batchSize;
        from += batchSize;
      }

      return allEmployees;
    },
  });
};

export const useEmployee = (id: string) => {
  return useQuery({
    queryKey: ["employees", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

export const useCreateEmployee = () => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";
  
  return useMutation({
    mutationFn: async (employee: EmployeeInsert) => {
      const { data, error } = await supabase
        .from("employees")
        .insert({
          ...employee,
          environment: currentEnv,
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentEnv] });
    },
  });
};

export const useUpdateEmployee = () => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: EmployeeUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentEnv] });
    },
  });
};

export const useDeleteEmployee = () => {
  const queryClient = useQueryClient();
  const { environment } = useEnvironment();
  const currentEnv = environment || "barcarena";
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees", currentEnv] });
    },
  });
};
