import { memo } from "react";
import { Calendar, Clock, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const departments = ["Operações", "Transporte", "Manutenção"];

const nrOptions = [
  "NR-05", "NR-06", "NR-10", "NR-11", "NR-12", "NR-18", 
  "NR-33", "NR-35", "NR-36"
];

interface EmployeeFormProps {
  isEdit?: boolean;
  name: string;
  setName: (name: string) => void;
  role: string;
  setRole: (role: string) => void;
  department: string;
  setDepartment: (department: string) => void;
  startDate: Date | undefined;
  setStartDate: (date: Date | undefined) => void;
  vacationDueDate: Date | undefined;
  setVacationDueDate: (date: Date | undefined) => void;
  examScheduled: Date | undefined;
  setExamScheduled: (date: Date | undefined) => void;
  selectedNrs: string[];
  toggleNr: (nr: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

const EmployeeForm = memo(({
  isEdit = false,
  name,
  setName,
  role,
  setRole,
  department,
  setDepartment,
  startDate,
  setStartDate,
  vacationDueDate,
  setVacationDueDate,
  examScheduled,
  setExamScheduled,
  selectedNrs,
  toggleNr,
  onSubmit,
  isPending,
}: EmployeeFormProps) => (
  <div className="grid gap-4 py-4">
    <div className="grid gap-2">
      <Label htmlFor="name">Nome completo *</Label>
      <Input 
        id="name" 
        placeholder="Nome do funcionário" 
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="role">Cargo *</Label>
      <Input 
        id="role" 
        placeholder="Ex: Polivalente" 
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
    </div>
    <div className="grid gap-2">
      <Label htmlFor="department">Departamento *</Label>
      <Select value={department} onValueChange={setDepartment}>
        <SelectTrigger>
          <SelectValue placeholder="Selecione o departamento" />
        </SelectTrigger>
        <SelectContent>
          {departments.map((dept) => (
            <SelectItem key={dept} value={dept}>
              {dept}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
    
    <div className="grid gap-2">
      <Label>Data de Admissão</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !startDate && "text-muted-foreground"
            )}
          >
            <Calendar className="mr-2 h-4 w-4" />
            {startDate ? format(startDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent
            mode="single"
            selected={startDate}
            onSelect={setStartDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    <div className="grid gap-2">
      <Label>Data Limite para Férias</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !vacationDueDate && "text-muted-foreground"
            )}
          >
            <Clock className="mr-2 h-4 w-4" />
            {vacationDueDate ? format(vacationDueDate, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent
            mode="single"
            selected={vacationDueDate}
            onSelect={setVacationDueDate}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    <div className="grid gap-2">
      <Label>Exame Marcado</Label>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "justify-start text-left font-normal",
              !examScheduled && "text-muted-foreground"
            )}
          >
            <Stethoscope className="mr-2 h-4 w-4" />
            {examScheduled ? format(examScheduled, "dd/MM/yyyy", { locale: ptBR }) : "Selecione a data"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <CalendarComponent
            mode="single"
            selected={examScheduled}
            onSelect={setExamScheduled}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>

    <div className="grid gap-2">
      <Label>NRs</Label>
      <div className="flex flex-wrap gap-2">
        {nrOptions.map((nr) => (
          <Badge
            key={nr}
            variant={selectedNrs.includes(nr) ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => toggleNr(nr)}
          >
            {nr}
          </Badge>
        ))}
      </div>
    </div>

    <Button 
      className="mt-4" 
      onClick={onSubmit}
      disabled={isPending}
    >
      {isEdit ? "Salvar Alterações" : "Adicionar"}
    </Button>
  </div>
));

EmployeeForm.displayName = "EmployeeForm";

export default EmployeeForm;
