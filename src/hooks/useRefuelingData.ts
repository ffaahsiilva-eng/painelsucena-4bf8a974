import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, format } from "date-fns";

const LITERS_PER_REFUEL = 20000;

interface RefuelingRecord {
  id: string;
  equipment_id: string;
  stop_reason: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  defect_description: string | null;
  changed_by_driver: string | null;
}

interface EquipmentInfo {
  id: string;
  name: string;
  plate: string;
}

export interface RefuelingByPoint {
  point: string;
  count: number;
  liters: number;
}

export interface RefuelingByVehicle {
  vehicleName: string;
  plate: string;
  count: number;
  liters: number;
}

export interface MonthlyRefueling {
  month: string;
  monthName: string;
  count: number;
  liters: number;
}

export interface DailyRefuelingByVehicle {
  vehicleName: string;
  plate: string;
  date: string;
  count: number;
  liters: number;
}

export interface DailyRefuelingRecord {
  date: string;
  formattedDate: string;
  time: string;
  vehicleName: string;
  plate: string;
  equipmentId: string;
  count: number;
  liters: number;
  point: string;
}

export interface RefuelingByVehicleWithPoints {
  vehicleName: string;
  plate: string;
  count: number;
  liters: number;
  byPoint: {
    "46": number;
    "3C": number;
    "3D": number;
    "82": number;
  };
}

export function useRefuelingData(year?: number, month?: number, dateFrom?: string, dateTo?: string) {
  const currentDate = new Date();
  const targetYear = year ?? currentDate.getFullYear();
  const targetMonth = month ?? currentDate.getMonth();

  // Calculate month boundaries
  const monthStart = startOfMonth(new Date(targetYear, targetMonth));
  const monthEnd = endOfMonth(new Date(targetYear, targetMonth));

  // If a custom date range is provided, expand the fetch window to cover it
  const fetchStart = dateFrom
    ? new Date(`${dateFrom}T00:00:00`)
    : monthStart;
  const fetchEnd = dateTo
    ? new Date(`${dateTo}T23:59:59`)
    : monthEnd;
  const rangeStart = fetchStart < monthStart ? fetchStart : monthStart;
  const rangeEnd = fetchEnd > monthEnd ? fetchEnd : monthEnd;

  return useQuery({
    queryKey: ["refueling-data", targetYear, targetMonth, dateFrom ?? null, dateTo ?? null],
    queryFn: async () => {
      // Get refueling records for the selected month (or expanded range)
      const { data: refuelingRecords, error: refError } = await supabase
        .from("equipment_stop_history")
        .select("*")
        .eq("stop_reason", "abastecimento")
        .not("ended_at", "is", null)
        .gte("started_at", rangeStart.toISOString())
        .lte("started_at", rangeEnd.toISOString())
        .order("started_at", { ascending: false });

      if (refError) throw refError;

      // Get equipment info
      const { data: equipmentData, error: eqError } = await supabase
        .from("equipment")
        .select("id, name, plate")
        .in("equipment_type", ["pipa"]);

      if (eqError) throw eqError;

      const equipmentMap = new Map<string, EquipmentInfo>();
      (equipmentData || []).forEach((eq) => {
        equipmentMap.set(eq.id, eq);
      });

      const records = (refuelingRecords || []) as RefuelingRecord[];

      // Calculate by point (for selected month only)
      const byPoint: Record<string, number> = { "46": 0, "3C": 0, "3D": 0, "82": 0 };
      records.forEach((record) => {
        const pointMatch = record.defect_description?.match(/Ponto:\s*(.+)/i);
        if (pointMatch) {
          const point = pointMatch[1].trim().toUpperCase();
          if (byPoint[point] !== undefined) {
            byPoint[point]++;
          }
        }
      });

      const refuelingByPoint: RefuelingByPoint[] = Object.entries(byPoint).map(
        ([point, count]) => ({
          point: `Ponto ${point}`,
          count,
          liters: count * LITERS_PER_REFUEL,
        })
      );

      // Calculate by vehicle with point breakdown (for selected month only)
      const byVehicle: Record<string, { 
        name: string; 
        plate: string; 
        count: number;
        byPoint: { "46": number; "3C": number; "3D": number; "82": number };
      }> = {};
      
      records.forEach((record) => {
        const eq = equipmentMap.get(record.equipment_id);
        if (eq) {
          if (!byVehicle[eq.id]) {
            byVehicle[eq.id] = { 
              name: eq.name, 
              plate: eq.plate, 
              count: 0,
              byPoint: { "46": 0, "3C": 0, "3D": 0, "82": 0 }
            };
          }
          byVehicle[eq.id].count++;
          
          // Extract point from defect_description
          const pointMatch = record.defect_description?.match(/Ponto:\s*(.+)/i);
          if (pointMatch) {
            const point = pointMatch[1].trim().toUpperCase();
            if (point === "46" || point === "3C" || point === "3D" || point === "82") {
              byVehicle[eq.id].byPoint[point as "46" | "3C" | "3D" | "82"]++;
            }
          }
        }
      });

      const refuelingByVehicle: RefuelingByVehicle[] = Object.values(byVehicle).map(
        (v) => ({
          vehicleName: v.name,
          plate: v.plate,
          count: v.count,
          liters: v.count * LITERS_PER_REFUEL,
        })
      );
      
      const refuelingByVehicleWithPoints: RefuelingByVehicleWithPoints[] = Object.values(byVehicle).map(
        (v) => ({
          vehicleName: v.name,
          plate: v.plate,
          count: v.count,
          liters: v.count * LITERS_PER_REFUEL,
          byPoint: v.byPoint,
        })
      );

      // Calculate monthly totals for the year (for the chart)
      const monthlyData: Record<string, number> = {};
      const monthNames = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
      ];

      // Initialize all months with 0
      for (let m = 0; m < 12; m++) {
        monthlyData[`${targetYear}-${String(m + 1).padStart(2, "0")}`] = 0;
      }

      // Fetch all records for the year to populate monthly chart
      const { data: yearRecords } = await supabase
        .from("equipment_stop_history")
        .select("started_at")
        .eq("stop_reason", "abastecimento")
        .not("ended_at", "is", null)
        .gte("started_at", new Date(targetYear, 0, 1).toISOString())
        .lte("started_at", new Date(targetYear, 11, 31, 23, 59, 59).toISOString());

      (yearRecords || []).forEach((record) => {
        const date = new Date(record.started_at);
        const key = `${targetYear}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        monthlyData[key]++;
      });

      const monthlyRefueling: MonthlyRefueling[] = Object.entries(monthlyData)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, count]) => {
          const monthIndex = parseInt(key.split("-")[1]) - 1;
          return {
            month: key,
            monthName: monthNames[monthIndex],
            count,
            liters: count * LITERS_PER_REFUEL,
          };
        });

      // Daily refueling by vehicle for the selected month
      const dailyByVehicle: Record<string, DailyRefuelingByVehicle> = {};
      records.forEach((record) => {
        const eq = equipmentMap.get(record.equipment_id);
        if (eq) {
          const date = format(new Date(record.started_at), "yyyy-MM-dd");
          const key = `${eq.id}-${date}`;
          if (!dailyByVehicle[key]) {
            dailyByVehicle[key] = {
              vehicleName: eq.name,
              plate: eq.plate,
              date,
              count: 0,
              liters: 0,
            };
          }
          dailyByVehicle[key].count++;
          dailyByVehicle[key].liters = dailyByVehicle[key].count * LITERS_PER_REFUEL;
        }
      });

      // Detailed daily records for table
      const dailyRecords: DailyRefuelingRecord[] = records.map((record) => {
        const eq = equipmentMap.get(record.equipment_id);
        const date = new Date(record.started_at);
        const pointMatch = record.defect_description?.match(/Ponto:\s*(.+)/i);
        const point = pointMatch ? pointMatch[1].trim().toUpperCase() : "N/A";
        
        return {
          date: format(date, "yyyy-MM-dd"),
          formattedDate: format(date, "dd/MM/yyyy"),
          time: format(date, "HH:mm"),
          vehicleName: eq?.name || "Desconhecido",
          plate: eq?.plate || "",
          equipmentId: record.equipment_id,
          count: 1,
          liters: LITERS_PER_REFUEL,
          point,
        };
      }).sort((a, b) => b.date.localeCompare(a.date));

      // Get unique vehicles for filter
      const uniqueVehicles = Array.from(
        new Map(
          records
            .map((r) => equipmentMap.get(r.equipment_id))
            .filter((eq): eq is EquipmentInfo => !!eq)
            .map((eq) => [eq.id, { id: eq.id, name: eq.name, plate: eq.plate }])
        ).values()
      );

      // Summary stats for selected month only
      const totalRefuelings = records.length;
      const totalLiters = totalRefuelings * LITERS_PER_REFUEL;

      return {
        refuelingByPoint,
        refuelingByVehicle,
        refuelingByVehicleWithPoints,
        monthlyRefueling,
        dailyByVehicle: Object.values(dailyByVehicle),
        dailyRecords,
        uniqueVehicles,
        totalRefuelings,
        totalLiters,
        currentMonthRefuelings: totalRefuelings,
        currentMonthLiters: totalLiters,
        litersPerRefuel: LITERS_PER_REFUEL,
      };
    },
    staleTime: 1000 * 60 * 2, // 2 min cache
  });
}
