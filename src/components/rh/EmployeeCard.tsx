import { memo, useEffect, useState } from "react";
import { Calendar, Clock, Stethoscope, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveStorageUrl } from "@/lib/storage";
import { DeleteConfirmation } from "@/components/ui/DeleteConfirmation";
import { Badge } from "@/components/ui/badge";
import { format, differenceInMonths, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Employee } from "@/hooks/useEmployees";

const statusLabels = {
  active: { label: "Ativo", class: "bg-success/20 text-success" },
  vacation: { label: "Férias", class: "bg-info/20 text-info" },
  leave: { label: "Licença", class: "bg-warning/20 text-warning" },
};

interface EmployeeCardProps {
  employee: Employee;
  canEdit: boolean;
  onEdit: (employee: Employee) => void;
  onDelete: (id: string) => void;
}

const calculateVacationStatus = (startDate: string, vacationDueDate?: string | null) => {
  const start = new Date(startDate);
  const now = new Date();
  
  if (vacationDueDate) {
    const dueDate = new Date(vacationDueDate);
    const monthsUntilVacation = differenceInMonths(dueDate, now);
    if (monthsUntilVacation <= 0) return "Férias vencidas!";
    return `${monthsUntilVacation} meses para férias`;
  }
  
  const defaultDue = addMonths(start, 12);
  const monthsUntil = differenceInMonths(defaultDue, now);
  if (monthsUntil <= 0) return "Férias vencidas!";
  return `${monthsUntil} meses para férias`;
};

const EmployeeCard = memo(({ employee, canEdit, onEdit, onDelete }: EmployeeCardProps) => {
  const [resolvedAvatar, setResolvedAvatar] = useState<string | null>(null);

  useEffect(() => {
    resolveStorageUrl(employee.avatar).then(setResolvedAvatar);
  }, [employee.avatar]);

  return (
    <div className="group bg-card rounded-xl p-4 sm:p-6 border border-border/50 hover:shadow-lg transition-all relative overflow-hidden h-full flex flex-col">
      <div className="flex items-start justify-between mb-4 relative z-10 shrink-0">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold text-base sm:text-xl shrink-0 overflow-hidden border-2 border-primary/20">
            {resolvedAvatar ? (
              <img 
                src={resolvedAvatar} 
                alt={employee.name} 
                className="w-full h-full object-cover" 
                key={resolvedAvatar}
              />
            ) : (
              employee.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h3 className="font-bold text-base sm:text-lg group-hover:text-primary transition-colors line-clamp-1">
              {employee.name}
            </h3>
            <p className="text-muted-foreground text-sm">{employee.role}</p>
          </div>
        </div>
        {canEdit && (
          <div className="flex items-center gap-0.5 sm:gap-1 z-20 pointer-events-auto">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(employee);
              }}
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <DeleteConfirmation
              onConfirm={() => onDelete(employee.id)}
              className="opacity-100 transition-opacity"
            />
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm flex-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>Admissão: {format(new Date(employee.start_date), "dd/MM/yyyy", { locale: ptBR })}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>{calculateVacationStatus(employee.start_date, employee.vacation_due_date)}</span>
        </div>
        {employee.exam_scheduled && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Stethoscope className="w-4 h-4" />
            <span>Exame: {format(new Date(employee.exam_scheduled), "dd/MM/yyyy", { locale: ptBR })}</span>
          </div>
        )}
      </div>

      {employee.nrs && employee.nrs.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1">
          {employee.nrs.map((nr: string) => (
            <Badge key={nr} variant="secondary" className="text-xs">
              {nr}
            </Badge>
          ))}
        </div>
      )}

      <div className="mt-auto pt-4 border-t border-border/50 flex items-center justify-between shrink-0">
        <span className="inline-block px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold">
          {employee.department}
        </span>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            statusLabels[employee.status as keyof typeof statusLabels]?.class || ""
          }`}
        >
          {statusLabels[employee.status as keyof typeof statusLabels]?.label || employee.status}
        </span>
      </div>
    </div>
  );
});

EmployeeCard.displayName = "EmployeeCard";

export default EmployeeCard;
