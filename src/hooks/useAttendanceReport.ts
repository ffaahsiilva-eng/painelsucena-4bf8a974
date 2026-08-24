import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import type { Tables } from "@/integrations/supabase/types";

type AttendanceWithEmployee = Tables<"attendance_records"> & {
  employees: Tables<"employees"> | null;
};

// Map roles to areas
const roleToArea: Record<string, string> = {
  Polivalente: "ÁREA GABIÃO",
  "Meia Oficial": "ÁREA GABIÃO",
  Jardineiro: "ROÇAGEM E PODAGEM",
  "Motorista do Pipa": "ROÇAGEM E PODAGEM",
  "Motorista do Munck": "ROÇAGEM E PODAGEM",
  Sinaleiro: "ROÇAGEM E PODAGEM",
  "Mecânico Montador": "ROÇAGEM E PODAGEM",
  "Auxiliar de Elétrica": "ROÇAGEM E PODAGEM",
  Eletricista: "ROÇAGEM E PODAGEM",
};

// Ajudante belongs to their specific area based on employee
const gabiaAjudantes = [
  "Flávio Henrique",
  "Vinícius Junior",
  "Welber Santo",
  "Filipe dos Santos",
  "Ezedequias Silva",
];

// Role labels for display
const roleLabels: Record<string, Record<string, string>> = {
  "ÁREA GABIÃO": {
    Polivalente: "👷 Polivalentes:",
    "Meia Oficial": "👷 Meia oficial:",
    Ajudante: "👷 Ajudante:",
  },
  "ROÇAGEM E PODAGEM": {
    Jardineiro: "👷 Jardineiro:",
    Ajudante: "👷 Ajudante:",
    "Motorista do Pipa": "👷 Motorista do Pipa",
    "Motorista do Munck": "👷 Motorista do Munck",
    Sinaleiro: "👷 Sinaleiro",
    "Mecânico Montador": "👷 Mecânico montador",
    "Auxiliar de Elétrica": "👷 Auxiliar de elétrica",
    Eletricista: "👷 Eletricista",
  },
};

const executionRoles: Record<string, string[]> = {
  "ÁREA GABIÃO": ["Polivalente", "Meia Oficial", "Ajudante"],
  "ROÇAGEM E PODAGEM": [
    "Jardineiro",
    "Ajudante",
    "Motorista do Pipa",
    "Motorista do Munck",
    "Sinaleiro",
    "Mecânico Montador",
    "Auxiliar de Elétrica",
    "Eletricista",
  ],
};

export interface SupportTeam {
  tst: string;
  encGeral: string;
  enc: string;
}

const getArea = (employee: Tables<"employees">) => {
  if (employee.role === "Ajudante") {
    return gabiaAjudantes.some(
      (n) => n.toUpperCase() === employee.name.toUpperCase()
    )
      ? "ÁREA GABIÃO"
      : "ROÇAGEM E PODAGEM";
  }
  return roleToArea[employee.role] || "ROÇAGEM E PODAGEM";
};

export const useAttendanceReportData = (date: string) => {
  // Fetch attendance records for the selected date with employees
  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ["attendance_report", date],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select(`id, employee_id, date, status, employees (id, name, role)`)
        .eq("date", date);

      if (error) throw error;
      return data as AttendanceWithEmployee[];
    },
    enabled: !!date,
  });

  // Fetch all employees
  const { data: allEmployees, isLoading: employeesLoading } = useQuery({
    queryKey: ["employees_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employees")
        .select("id, name, role")
        .order("name");

      if (error) throw error;
      return data as Tables<"employees">[];
    },
  });

  // Create a map of employee attendance status
  const attendanceMap = useMemo(() => {
    const map = new Map<string, { status: "present" | "absent"; id?: string }>();
    records?.forEach((r) => {
      if (r.employees) {
        const normalizedStatus = r.status === "present" || r.status === "late" ? "present" : "absent";
        map.set(r.employee_id, { status: normalizedStatus, id: r.id });
      }
    });
    return map;
  }, [records]);

  // Group employees by area and role
  const groupedEmployees = useMemo(() => {
    if (!allEmployees) return { "ÁREA GABIÃO": {}, "ROÇAGEM E PODAGEM": {} };

    const grouped: Record<string, Record<string, Tables<"employees">[]>> = {
      "ÁREA GABIÃO": {},
      "ROÇAGEM E PODAGEM": {},
    };

    allEmployees.forEach((emp) => {
      const area = getArea(emp);
      if (!grouped[area][emp.role]) {
        grouped[area][emp.role] = [];
      }
      grouped[area][emp.role].push(emp);
    });

    return grouped;
  }, [allEmployees]);

  const getStatusEmoji = (employeeId: string) => {
    const attendance = attendanceMap.get(employeeId);
    // Se não tem registro, considera presente por padrão
    if (!attendance) return "✅";
    return attendance.status === "present" ? "✅" : "❌";
  };

  const isPresent = (employeeId: string) => {
    const attendance = attendanceMap.get(employeeId);
    if (!attendance) return true; // Presente por padrão
    return attendance.status === "present";
  };

  return {
    records,
    allEmployees,
    attendanceMap,
    groupedEmployees,
    getStatusEmoji,
    isPresent,
    isLoading: recordsLoading || employeesLoading,
  };
};

// Convert name to Title Case (only first letter of each word capitalized)
const toTitleCase = (name: string): string => {
  return name
    .toLowerCase()
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};

// Generate formatted efetivo text for an area (with employee names)
export const generateEfetivoText = (
  area: "ÁREA GABIÃO" | "ROÇAGEM E PODAGEM",
  groupedEmployees: Record<string, Record<string, Tables<"employees">[]>>,
  isPresent: (employeeId: string) => boolean,
  _support: SupportTeam // Not used for RDO, kept for backwards compatibility
): string => {
  let report = "";

  const staticRoles = executionRoles[area] || [];
  const dynamicRoles = Object.keys(groupedEmployees[area] || {});
  const roles = [...staticRoles, ...dynamicRoles.filter(r => !staticRoles.includes(r))];
  roles.forEach((role) => {
    const label = roleLabels[area]?.[role] || `👷 ${role}:`;
    const employees = groupedEmployees[area]?.[role] || [];
    const presentEmployees = employees.filter((emp) => isPresent(emp.id));
    
    if (employees.length > 0 && presentEmployees.length > 0) {
      // Remove emoji and colon from label for cleaner display
      const cleanLabel = label.replace(/^👷\s*/g, '').replace(/:$/, '');
      report += `👷 ${cleanLabel}: ${presentEmployees.length}\n`;
      // Add employee names with Title Case formatting
      presentEmployees.forEach((emp) => {
        report += `   • ${toTitleCase(emp.name)}\n`;
      });
      report += "\n";
    }
  });

  return report.trim();
};

// Format efetivo for RDO display (simplified version)
export const formatEfetivoForRDO = (efetivoText: string | null | undefined): string => {
  if (!efetivoText) return "";
  return efetivoText;
};
