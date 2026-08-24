import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowDownCircle, ArrowUpCircle, RefreshCw, User, Truck, MapPin, Trash2, Check, ChevronsUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { useRecordMovement, InventoryItem } from "@/hooks/useInventory";
import { useEmployees } from "@/hooks/useEmployees";
import { useEquipment } from "@/hooks/useEquipment";

const formSchema = z.object({
  movement_type: z.enum(["entrada", "saida", "ajuste"]),
  quantity: z.coerce.number().min(0, "Quantidade inválida"),
  reason: z.string().trim().min(3, "Informe o motivo da alteração (mín. 3 caracteres)"),
  destination_type: z.string().optional(),
  destination_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface MovementDialogProps {
  item: InventoryItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const MOVEMENT_TYPES = [
  { value: "entrada", label: "Entrada", icon: ArrowDownCircle, color: "text-green-500" },
  { value: "saida", label: "Saída", icon: ArrowUpCircle, color: "text-red-500" },
  { value: "ajuste", label: "Ajuste de Estoque", icon: RefreshCw, color: "text-yellow-500" },
];

const DESTINATION_TYPES = [
  { value: "employee", label: "Funcionário", icon: User },
  { value: "equipment", label: "Equipamento", icon: Truck },
  { value: "gabiao", label: "Área - Gabião", icon: MapPin },
  { value: "jardinagem", label: "Área - Jardinagem", icon: MapPin },
  { value: "descarte", label: "Descarte", icon: Trash2 },
];

export function MovementDialog({ item, open, onOpenChange }: MovementDialogProps) {
  const recordMovement = useRecordMovement();
  const { data: employees } = useEmployees();
  const { data: equipment } = useEquipment();
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  const employeeOptions = useMemo(() => {
    return (employees || [])
      .filter((emp) => emp.status === "active")
      .map((emp) => ({
        value: emp.id,
        name: emp.name,
        role: emp.role || "",
        department: emp.department || "",
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees]);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      movement_type: "entrada",
      quantity: 1,
      reason: "",
      destination_type: "",
      destination_id: "",
    },
  });

  const movementType = form.watch("movement_type");
  const destinationType = form.watch("destination_type");

  // Reset destination fields when movement type changes
  useEffect(() => {
    if (movementType !== "saida") {
      form.setValue("destination_type", "");
      form.setValue("destination_id", "");
    }
  }, [movementType, form]);

  // Reset destination_id when destination_type changes
  useEffect(() => {
    form.setValue("destination_id", "");
  }, [destinationType, form]);

  const getDestinationName = (destType: string, destId: string): string => {
    if (destType === "employee") {
      const selected = employeeOptions.find((e) => e.value === destId);
      if (selected) return `${selected.name} - ${selected.role}`;
      return "";
    }
    if (destType === "equipment") {
      const eq = equipment?.find((e) => e.id === destId);
      return eq ? `${eq.name} (${eq.plate})` : "";
    }
    if (destType === "gabiao") return "Área Gabião";
    if (destType === "jardinagem") return "Área Jardinagem";
    if (destType === "descarte") return "Descarte";
    return "";
  };

  const onSubmit = async (data: FormData) => {
    if (!item) return;

    const destinationName = data.destination_type
      ? getDestinationName(data.destination_type, data.destination_id || "")
      : undefined;

    const destinationId = data.destination_id || undefined;

    await recordMovement.mutateAsync({
      item_id: item.id,
      movement_type: data.movement_type,
      quantity: data.quantity,
      reason: data.reason,
      destination_type: data.destination_type || undefined,
      destination_id: destinationId,
      destination_name: destinationName,
    });
    form.reset();
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      form.reset();
    }
    onOpenChange(isOpen);
  };

  if (!item) return null;

  const needsDestinationId = destinationType === "employee" || destinationType === "equipment";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Movimentação de Estoque</DialogTitle>
        </DialogHeader>
        
        <div className="bg-muted/50 p-3 rounded-lg mb-4">
          <p className="font-medium">{item.name}</p>
          <p className="text-sm text-muted-foreground">
            Quantidade atual: <span className="font-semibold">{item.quantity} {item.unit}</span>
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="movement_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Movimentação *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MOVEMENT_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex items-center gap-2">
                            <type.icon className={`h-4 w-4 ${type.color}`} />
                            {type.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {movementType === "ajuste" ? "Nova Quantidade *" : "Quantidade *"}
                  </FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={movementType === "ajuste" ? 0 : 1} 
                      {...field} 
                    />
                  </FormControl>
                  {movementType === "saida" && (
                    <p className="text-xs text-muted-foreground">
                      Máximo disponível: {item.quantity}
                    </p>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {movementType === "saida" && (
              <>
                <FormField
                  control={form.control}
                  name="destination_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Destino da Retirada</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o destino (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {DESTINATION_TYPES.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div className="flex items-center gap-2">
                                <type.icon className="h-4 w-4" />
                                {type.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {destinationType === "employee" && (
                  <FormField
                    control={form.control}
                    name="destination_id"
                    render={({ field }) => {
                      const selectedEmployee = employeeOptions.find(e => e.value === field.value);
                      return (
                        <FormItem>
                          <FormLabel>Funcionário</FormLabel>
                          <Popover open={employeePopoverOpen} onOpenChange={setEmployeePopoverOpen}>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  role="combobox"
                                  className={cn("w-full justify-between font-normal h-10", !field.value && "text-muted-foreground")}
                                >
                                  {selectedEmployee ? `${selectedEmployee.name} — ${selectedEmployee.role}` : "Selecione o funcionário"}
                                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="p-0 w-[--radix-popover-trigger-width]" align="start">
                              <Command>
                                <CommandInput placeholder="Buscar funcionário..." />
                                <CommandList>
                                  <CommandEmpty>Nenhum funcionário encontrado</CommandEmpty>
                                  {employeeOptions.map((emp) => (
                                    <CommandItem
                                      key={emp.value}
                                      value={`${emp.name} ${emp.role}`}
                                      onSelect={() => {
                                        field.onChange(emp.value);
                                        setEmployeePopoverOpen(false);
                                      }}
                                    >
                                      <Check className={cn("mr-2 h-4 w-4", field.value === emp.value ? "opacity-100" : "opacity-0")} />
                                      <div className="flex flex-col">
                                        <span>{emp.name}</span>
                                        <span className="text-xs text-muted-foreground">{emp.role}</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />
                )}

                {destinationType === "equipment" && (
                  <FormField
                    control={form.control}
                    name="destination_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Equipamento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o equipamento" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {equipment?.map((eq) => (
                              <SelectItem key={eq.id} value={eq.id}>
                                {eq.name} ({eq.plate})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </>
            )}

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Motivo da alteração *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o motivo da alteração de estoque (será enviado no grupo do WhatsApp)..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={recordMovement.isPending}>
                {recordMovement.isPending ? "Registrando..." : "Registrar"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
