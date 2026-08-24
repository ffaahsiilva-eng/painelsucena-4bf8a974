import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useEmployees, useUpdateEmployee, useDeleteEmployee, type Employee } from "@/hooks/useEmployees";
import { Search, Users, Edit3, Trash2, CheckSquare, Square, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const departments = ["Gabião", "Jardinagem", "Administrativo"];
const statuses = [
  { value: "active", label: "Ativo" },
  { value: "vacation", label: "Férias" },
  { value: "leave", label: "Afastado" },
];

export function BulkEmployeeEditor() {
  const { data: employees = [], isLoading } = useEmployees();
  const updateEmployee = useUpdateEmployee();
  const deleteEmployee = useDeleteEmployee();

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  
  // Bulk edit state
  const [bulkDepartment, setBulkDepartment] = useState<string>("");
  const [bulkStatus, setBulkStatus] = useState<string>("");
  const [bulkRole, setBulkRole] = useState<string>("");
  
  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const filteredEmployees = useMemo(() => {
    const searchLower = searchTerm.toLowerCase();
    return employees.filter((emp) => {
      const matchesSearch =
        emp.name.toLowerCase().includes(searchLower) ||
        emp.role.toLowerCase().includes(searchLower);
      const matchesDepartment =
        filterDepartment === "all" || emp.department === filterDepartment;
      return matchesSearch && matchesDepartment;
    });
  }, [employees, searchTerm, filterDepartment]);

  const allSelected = filteredEmployees.length > 0 && filteredEmployees.every((emp) => selectedIds.has(emp.id));
  const someSelected = filteredEmployees.some((emp) => selectedIds.has(emp.id));

  const toggleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredEmployees.map((emp) => emp.id)));
    }
  }, [allSelected, filteredEmployees]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleBulkUpdate = async () => {
    if (selectedIds.size === 0) {
      toast.error("Selecione ao menos um funcionário.");
      return;
    }

    const updates: Partial<Employee> = {};
    if (bulkDepartment) updates.department = bulkDepartment;
    if (bulkStatus) updates.status = bulkStatus as Employee["status"];
    if (bulkRole) updates.role = bulkRole;

    if (Object.keys(updates).length === 0) {
      toast.error("Selecione ao menos um campo para atualizar.");
      return;
    }

    setIsProcessing(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        updateEmployee.mutateAsync({ id, ...updates })
      );
      await Promise.all(promises);
      toast.success(`${selectedIds.size} funcionário(s) atualizado(s) com sucesso!`);
      setSelectedIds(new Set());
      setBulkDepartment("");
      setBulkStatus("");
      setBulkRole("");
    } catch (error) {
      console.error("Bulk update error:", error);
      toast.error("Erro ao atualizar funcionários.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBulkDelete = async () => {
    setIsProcessing(true);
    try {
      const promises = Array.from(selectedIds).map((id) =>
        deleteEmployee.mutateAsync(id)
      );
      await Promise.all(promises);
      toast.success(`${selectedIds.size} funcionário(s) removido(s) com sucesso!`);
      setSelectedIds(new Set());
    } catch (error) {
      console.error("Bulk delete error:", error);
      toast.error("Erro ao remover funcionários.");
    } finally {
      setIsProcessing(false);
      setShowDeleteConfirm(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/50">Ativo</Badge>;
      case "vacation":
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/50">Férias</Badge>;
      case "leave":
        return <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/50">Afastado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Funcionários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{employees.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Selecionados</CardTitle>
            <CheckSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedIds.size}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Filtrados</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEmployees.length}</div>
          </CardContent>
        </Card>
      </div>

      {/* Bulk Actions */}
      {selectedIds.size > 0 && (
        <Card className="border-primary/50 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Edit3 className="w-5 h-5" />
              Edição em Massa ({selectedIds.size} selecionado{selectedIds.size > 1 ? "s" : ""})
            </CardTitle>
            <CardDescription>
              Altere os campos abaixo para aplicar a todos os funcionários selecionados.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Departamento</label>
                <Select value={bulkDepartment} onValueChange={setBulkDepartment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não alterar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não alterar</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={bulkStatus} onValueChange={setBulkStatus}>
                  <SelectTrigger>
                    <SelectValue placeholder="Não alterar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Não alterar</SelectItem>
                    {statuses.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Função</label>
                <Input
                  placeholder="Nova função..."
                  value={bulkRole}
                  onChange={(e) => setBulkRole(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button
                  onClick={handleBulkUpdate}
                  disabled={isProcessing}
                  className="flex-1"
                >
                  {isProcessing ? "Atualizando..." : "Aplicar Alterações"}
                </Button>
                <Button
                  variant="destructive"
                  size="icon"
                  onClick={() => setShowDeleteConfirm(true)}
                  disabled={isProcessing}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Funcionários</CardTitle>
          <CardDescription>
            Selecione os funcionários que deseja editar em massa.
          </CardDescription>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Buscar por nome ou função..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterDepartment} onValueChange={setFilterDepartment}>
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os departamentos</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept} value={dept}>
                    {dept}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {filteredEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum funcionário encontrado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      aria-label="Selecionar todos"
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmployees.map((emp) => (
                  <TableRow
                    key={emp.id}
                    className={selectedIds.has(emp.id) ? "bg-primary/10" : ""}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedIds.has(emp.id)}
                        onCheckedChange={() => toggleSelect(emp.id)}
                        aria-label={`Selecionar ${emp.name}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{emp.role}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{emp.department}</Badge>
                    </TableCell>
                    <TableCell>{getStatusBadge(emp.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              Confirmar Exclusão em Massa
            </AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir permanentemente{" "}
              <strong>{selectedIds.size} funcionário(s)</strong>. Esta ação não
              pode ser desfeita. Todos os registros de presença associados
              também serão afetados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkDelete}
              disabled={isProcessing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isProcessing ? "Excluindo..." : "Excluir Funcionários"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
