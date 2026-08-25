import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

// Generate unique ID for status entries
const generateStatusId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export interface RefuelingPoint {
  point: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
}

export interface StatusHistoryEntry {
  id?: string;
  status: string;
  timestamp: string;
  changed_by: string | null;
  description?: string;
}

export interface DailyShiftRecord {
  id: string;
  equipment_id: string;
  equipment_name: string;
  plate: string;
  shift_date: string;
  driver_name: string;
  helper_name: string | null;
  initial_horimeter: number | null;
  initial_km: number | null;
  initial_fuel_level: string | null;
  shift_start_time: string | null;
  final_horimeter: number | null;
  final_km: number | null;
  final_fuel_level: string | null;
  shift_end_time: string | null;
  refueling_points: RefuelingPoint[];
  status_history: StatusHistoryEntry[];
  created_at: string;
  updated_at: string;
}

export interface CreateShiftRecordData {
  equipment_id: string;
  equipment_name: string;
  plate: string;
  driver_name: string;
  helper_name?: string;
  initial_horimeter?: number;
  initial_km?: number;
  initial_fuel_level?: string;
}

export interface UpdateShiftRecordData {
  id?: string;
  equipment_id?: string;
  shift_date?: string;
  initial_horimeter?: number;
  initial_km?: number;
  final_horimeter?: number;
  final_km?: number;
  final_fuel_level?: string;
  shift_end_time?: string;
  refueling_points?: RefuelingPoint[];
  status_history?: StatusHistoryEntry[];
}

// Helper to parse JSON data safely
const parseShiftRecord = (data: any): DailyShiftRecord => {
  return {
    ...data,
    refueling_points: Array.isArray(data.refueling_points) ? data.refueling_points : [],
    status_history: Array.isArray(data.status_history) ? data.status_history : [],
  };
};

// Get all daily shift records
export function useDailyShiftRecords(date?: string) {
  return useQuery({
    queryKey: ["daily-shift-records", date],
    queryFn: async () => {
      let query = supabase
        .from("daily_shift_records")
        .select("id, equipment_id, equipment_name, plate, shift_date, driver_name, helper_name, initial_horimeter, initial_km, initial_fuel_level, shift_start_time, final_horimeter, final_km, final_fuel_level, shift_end_time, refueling_points, status_history, created_at, updated_at")
        .order("shift_date", { ascending: false });

      if (date) {
        query = query.eq("shift_date", date);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(parseShiftRecord);
    },
  });
}

// Get a specific shift record by equipment and date
export function useShiftRecordByEquipment(equipmentId: string | null, date?: string) {
  const today = date || new Date().toISOString().split("T")[0];
  
  return useQuery({
    queryKey: ["daily-shift-record", equipmentId, today],
    queryFn: async () => {
      if (!equipmentId) return null;
      
      let query = supabase
        .from("daily_shift_records")
        .select("id, equipment_id, equipment_name, plate, shift_date, driver_name, helper_name, initial_horimeter, initial_km, initial_fuel_level, shift_start_time, final_horimeter, final_km, final_fuel_level, shift_end_time, refueling_points, status_history, created_at, updated_at")
        .eq("equipment_id", equipmentId);
        
      if (date) {
        query = query.eq("shift_date", date).maybeSingle();
      } else {
        // Find the latest open shift
        query = query.is("shift_end_time", null).order("shift_start_time", { ascending: false }).limit(1).maybeSingle();
      }

      const { data, error } = await query;

      if (error) throw error;
      return data ? parseShiftRecord(data) : null;
    },
    enabled: !!equipmentId,
  });
}

// Create or update shift record when starting shift
export function useCreateShiftRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateShiftRecordData) => {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      const statusHistory: Json = [
        {
          status: "operando",
          timestamp: now,
          changed_by: data.driver_name,
        },
      ];

      // Try to upsert (insert or update on conflict)
      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .upsert(
          {
            equipment_id: data.equipment_id,
            equipment_name: data.equipment_name,
            plate: data.plate,
            shift_date: today,
            driver_name: data.driver_name,
            helper_name: data.helper_name || null,
            initial_horimeter: data.initial_horimeter || null,
            initial_km: data.initial_km || null,
            initial_fuel_level: data.initial_fuel_level || null,
            shift_start_time: now,
            status_history: statusHistory,
          },
          {
            onConflict: "equipment_id,shift_date",
          }
        )
        .select()
        .single();

      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
    onError: (error) => {
      console.error("Error creating shift record:", error);
      toast.error("Erro ao registrar início de turno");
    },
  });
}

// Update shift record (for status changes, end of shift, etc.)
export function useUpdateShiftRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateShiftRecordData) => {
      const { id, equipment_id, shift_date, refueling_points, status_history, ...rest } = data;
      
      const updateData: Record<string, any> = { ...rest };
      if (refueling_points) {
        updateData.refueling_points = refueling_points as unknown as Json;
      }
      if (status_history) {
        updateData.status_history = status_history as unknown as Json;
      }
      
      let query;
      
      if (id) {
        query = supabase
          .from("daily_shift_records")
          .update(updateData)
          .eq("id", id);
      } else if (equipment_id && shift_date) {
        // When updating by equipment_id and shift_date, we also update equipment_name and plate
        // to ensure the shift record reflects current equipment info (useful for WhatsApp/PDF)
        const { data: eq } = await supabase
          .from("equipment")
          .select("name, plate")
          .eq("id", equipment_id)
          .single();
        
        if (eq) {
          updateData.equipment_name = eq.name;
          updateData.plate = eq.plate;
        }

        query = supabase
          .from("daily_shift_records")
          .update(updateData)
          .eq("equipment_id", equipment_id)
          .eq("shift_date", shift_date);
      } else {
        throw new Error("Either id or equipment_id with shift_date is required");
      }

      const { data: result, error } = await query.select().single();
      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
    onError: (error) => {
      console.error("Error updating shift record:", error);
    },
  });
}

// Add status change to history
export function useAddStatusToHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipmentId,
      status,
      changedBy,
      description,
      customTimestamp,
      shiftDate,
      equipmentName,
      equipmentPlate,
    }: {
      equipmentId: string;
      status: string;
      changedBy: string | null;
      description?: string;
      customTimestamp?: string;
      shiftDate?: string;
      equipmentName?: string;
      equipmentPlate?: string;
    }) => {
      const targetDate = shiftDate || new Date().toISOString().split("T")[0];
      const timestamp = customTimestamp || new Date().toISOString();

      // First get the current record
      const { data: current, error: fetchError } = await supabase
        .from("daily_shift_records")
        .select("status_history")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", targetDate)
        .maybeSingle();

      if (fetchError) throw fetchError;

      // If no record exists for this date, create one so admin can add status to any date
      if (!current) {
        // Fetch equipment info if not provided
        let name = equipmentName || "";
        let plate = equipmentPlate || "";
        if (!name || !plate) {
          const { data: eq } = await supabase
            .from("equipment")
            .select("name, plate, driver")
            .eq("id", equipmentId)
            .single();
          if (eq) {
            name = name || eq.name;
            plate = plate || eq.plate;
          }
        }

        const newEntry: StatusHistoryEntry = {
          id: generateStatusId(),
          status,
          timestamp,
          changed_by: changedBy,
          description,
        };

        const { data: created, error: createErr } = await supabase
          .from("daily_shift_records")
          .insert({
            equipment_id: equipmentId,
            equipment_name: name,
            plate,
            shift_date: targetDate,
            driver_name: changedBy || "Admin",
            status_history: [newEntry] as unknown as Json,
          })
          .select()
          .single();

        if (createErr) throw createErr;
        return parseShiftRecord(created);
      }

      const currentHistory = Array.isArray(current.status_history) 
        ? (current.status_history as unknown as StatusHistoryEntry[])
        : [];
      
      // For admin edits with custom timestamp, don't check for duplicates
      if (!customTimestamp) {
        // Check if the last status is the same - if so, don't add duplicate
        const lastEntry = currentHistory[currentHistory.length - 1];
        if (lastEntry && lastEntry.status === status && !description) {
          // Same status without description, don't add duplicate - return current record
          return null;
        }
      }
      
      const newEntry: StatusHistoryEntry = {
        id: generateStatusId(),
        status,
        timestamp,
        changed_by: changedBy,
        description,
      };
      
      // Add new entry and sort by timestamp
      const newHistory = [...currentHistory, newEntry]
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) as unknown as Json;

      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .update({ status_history: newHistory })
        .eq("equipment_id", equipmentId)
        .eq("shift_date", targetDate)
        .select()
        .single();

      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
  });
}

// Remove status from history (Admin only)
export function useRemoveStatusFromHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipmentId,
      statusIndex,
      shiftDate,
    }: {
      equipmentId: string;
      statusIndex: number;
      shiftDate?: string;
    }) => {
      const targetDate = shiftDate || new Date().toISOString().split("T")[0];

      // First get the current record
      const { data: current, error: fetchError } = await supabase
        .from("daily_shift_records")
        .select("status_history")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", targetDate)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!current) return null;

      const currentHistory = Array.isArray(current.status_history) 
        ? (current.status_history as unknown as StatusHistoryEntry[])
        : [];
      
      // Get the entry being removed so we can also remove from equipment_stop_history
      const removedEntry = currentHistory[statusIndex];
      
      // Remove the entry at the specified index
      const newHistory = currentHistory.filter((_, index) => index !== statusIndex) as unknown as Json;

      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .update({ status_history: newHistory })
        .eq("equipment_id", equipmentId)
        .eq("shift_date", targetDate)
        .select()
        .single();

      if (error) throw error;

      // Also remove the corresponding entry from equipment_stop_history
      if (removedEntry) {
        const entryTime = new Date(removedEntry.timestamp);
        const startOfDay = new Date(targetDate + "T00:00:00");
        const endOfDay = new Date(targetDate + "T23:59:59");
        
        // Find and delete matching stop history record
        const { data: stopRecords } = await supabase
          .from("equipment_stop_history")
          .select("id, started_at, stop_reason")
          .eq("equipment_id", equipmentId)
          .gte("started_at", startOfDay.toISOString())
          .lte("started_at", endOfDay.toISOString());
        
        if (stopRecords) {
          // Find the record closest to the removed entry's timestamp
          const matchingRecord = stopRecords.find(r => {
            const diff = Math.abs(new Date(r.started_at).getTime() - entryTime.getTime());
            return diff < 120000; // within 2 minutes
          });
          
          if (matchingRecord) {
            await supabase
              .from("equipment_stop_history")
              .delete()
              .eq("id", matchingRecord.id);
          }
        }
      }

      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
    },
  });
}

// Update status entry in history (Admin only - change time, status, or description)
export function useUpdateStatusInHistory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipmentId,
      statusIndex,
      newStatus,
      newTimestamp,
      newDescription,
      shiftDate,
    }: {
      equipmentId: string;
      statusIndex: number;
      newStatus?: string;
      newTimestamp?: string;
      newDescription?: string;
      shiftDate?: string;
    }) => {
      const targetDate = shiftDate || new Date().toISOString().split("T")[0];

      // First get the current record
      const { data: current, error: fetchError } = await supabase
        .from("daily_shift_records")
        .select("status_history")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", targetDate)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!current) return null;

      const currentHistory = Array.isArray(current.status_history) 
        ? (current.status_history as unknown as StatusHistoryEntry[])
        : [];
      
      if (statusIndex < 0 || statusIndex >= currentHistory.length) {
        throw new Error("Invalid status index");
      }

      // Save original entry for stop_history sync
      const originalEntry = currentHistory[statusIndex];

      // Update the entry at the specified index
      const updatedHistory = [...currentHistory];
      updatedHistory[statusIndex] = {
        ...updatedHistory[statusIndex],
        ...(newStatus !== undefined && { status: newStatus }),
        ...(newTimestamp !== undefined && { timestamp: newTimestamp }),
        ...(newDescription !== undefined && { description: newDescription }),
        changed_by: `${updatedHistory[statusIndex].changed_by || ""} (Editado)`.trim(),
      };

      // Re-sort by timestamp after update
      const newHistory = updatedHistory
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) as unknown as Json;

      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .update({ status_history: newHistory })
        .eq("equipment_id", equipmentId)
        .eq("shift_date", targetDate)
        .select()
        .single();

      if (error) throw error;

      // Also update the corresponding entry in equipment_stop_history
      if (originalEntry) {
        const entryTime = new Date(originalEntry.timestamp);
        const startOfDay = new Date(targetDate + "T00:00:00");
        const endOfDay = new Date(targetDate + "T23:59:59");
        
        const { data: stopRecords } = await supabase
          .from("equipment_stop_history")
          .select("id, started_at, stop_reason")
          .eq("equipment_id", equipmentId)
          .gte("started_at", startOfDay.toISOString())
          .lte("started_at", endOfDay.toISOString());
        
        if (stopRecords) {
          const matchingRecord = stopRecords.find(r => {
            const diff = Math.abs(new Date(r.started_at).getTime() - entryTime.getTime());
            return diff < 120000; // within 2 minutes
          });
          
          if (matchingRecord) {
            const updateData: Record<string, any> = {};
            if (newStatus !== undefined) updateData.stop_reason = newStatus;
            if (newTimestamp !== undefined) updateData.started_at = newTimestamp;
            if (newDescription !== undefined) updateData.defect_description = newDescription;
            
            if (Object.keys(updateData).length > 0) {
              await supabase
                .from("equipment_stop_history")
                .update(updateData)
                .eq("id", matchingRecord.id);
            }
          }
        }
      }

      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
      queryClient.invalidateQueries({ queryKey: ["equipment-stop-history"] });
    },
  });
}

// Add refueling point
export function useAddRefuelingPoint() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      equipmentId,
      point,
      action,
    }: {
      equipmentId: string;
      point: string;
      action: "start" | "end";
    }) => {
      const today = new Date().toISOString().split("T")[0];
      const now = new Date().toISOString();

      // First get the current record
      const { data: current, error: fetchError } = await supabase
        .from("daily_shift_records")
        .select("refueling_points")
        .eq("equipment_id", equipmentId)
        .eq("shift_date", today)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!current) return null;

      let refuelingPoints: RefuelingPoint[] = Array.isArray(current.refueling_points) 
        ? (current.refueling_points as unknown as RefuelingPoint[])
        : [];

      if (action === "start") {
        refuelingPoints.push({
          point,
          started_at: now,
          ended_at: null,
          duration_minutes: null,
        });
      } else {
        // Find the last open refueling at this point and close it
        const lastOpenIndex = refuelingPoints.findIndex(
          (r) => r.point === point && r.ended_at === null
        );
        if (lastOpenIndex !== -1) {
          const startTime = new Date(refuelingPoints[lastOpenIndex].started_at);
          const endTime = new Date(now);
          const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
          
          refuelingPoints[lastOpenIndex] = {
            ...refuelingPoints[lastOpenIndex],
            ended_at: now,
            duration_minutes: durationMinutes,
          };
        }
      }

      const { data: result, error } = await supabase
        .from("daily_shift_records")
        .update({ refueling_points: refuelingPoints as unknown as Json })
        .eq("equipment_id", equipmentId)
        .eq("shift_date", today)
        .select()
        .single();

      if (error) throw error;
      return parseShiftRecord(result);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-shift-records"] });
      queryClient.invalidateQueries({ queryKey: ["daily-shift-record"] });
    },
  });
}
