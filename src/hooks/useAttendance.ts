import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { resolveStorageUrl } from "@/lib/storage";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";
import type { Database } from "@/integrations/supabase/types";

export type AttendanceRecord = Tables<"attendance_records">;
export type AttendanceInsert = TablesInsert<"attendance_records">;
export type AttendanceUpdate = TablesUpdate<"attendance_records">;
export type AttendanceStatus = Database["public"]["Enums"]["attendance_status"];

export type AttendanceWithEmployee = AttendanceRecord & {
  employees: Tables<"employees"> | null;
};

export const useAttendanceRecords = (date?: string) => {
  return useQuery({
    queryKey: ["attendance_records", date],
    queryFn: async () => {
      let query = supabase
        .from("attendance_records")
        .select(`
          id, employee_id, status, date, location, notes, created_at,
          employees (id, name, avatar, cargo, status, environment)
        `)
        .order("created_at", { ascending: false });
      
      if (date) {
        query = query.eq("date", date);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      
      const resolvedData = await Promise.all((data || []).map(async (record: any) => {
        if (record.employees && record.employees.avatar) {
          record.employees.avatar = await resolveStorageUrl(record.employees.avatar);
        }
        return record;
      }));

      return resolvedData as AttendanceWithEmployee[];
    },
  });
};

export const useCreateAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: AttendanceInsert) => {
      const { data, error } = await supabase
        .from("attendance_records")
        .insert(record)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });
};

export const useUpdateAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, ...updates }: AttendanceUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("attendance_records")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });
};

export const useDeleteAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("attendance_records")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });
};

export const useUpsertAttendance = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (record: AttendanceInsert) => {
      const { data, error } = await supabase
        .from("attendance_records")
        .upsert(record, { 
          onConflict: "employee_id,date",
          ignoreDuplicates: false 
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["attendance_records"] });
    },
  });
};
