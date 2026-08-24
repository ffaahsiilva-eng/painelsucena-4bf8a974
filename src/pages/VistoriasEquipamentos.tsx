import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { VehicleInspectionTable } from "@/components/vistorias/VehicleInspectionTable";
import { ExportVehiclesButton } from "@/components/vistorias/ExportVehiclesButton";
import { ClipboardCheck, Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { AddVehicleDialog } from "@/components/vistorias/AddVehicleDialog";
import { useVehicleInspections } from "@/hooks/useVehicleInspections";
import { useVisualizadorContext } from "@/contexts/VisualizadorContext";

const VistoriasEquipamentos = () => {
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { data: vehicles, isLoading } = useVehicleInspections();
  const { isVisualizador } = useVisualizadorContext();

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-3 sm:py-6 animate-fade-in">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10">
                <ClipboardCheck className="w-5 h-5 text-primary" />
              </div>
              <div>
                <EditablePageTitle pageKey="vistorias" defaultValue="Vistorias Equipamentos" className="text-xl font-semibold text-foreground tracking-tight" />
                <p className="text-sm text-muted-foreground">
                  Relatório de Veículos Terceiros
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!isVisualizador && vehicles && vehicles.length > 0 && (
              <ExportVehiclesButton vehicles={vehicles} />
            )}
            {!isVisualizador && (
            <Button size="sm" className="gap-2 shadow-sm" onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Novo Veículo</span>
            </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {vehicles && vehicles.length > 0 && (
          <div className="flex items-center gap-6">
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{vehicles.length}</span> veículo(s) cadastrado(s)
            </span>
          </div>
        )}

        {/* Table */}
        <div className="rounded-xl border bg-card">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                <span className="text-sm text-muted-foreground">Carregando...</span>
              </div>
            </div>
          ) : vehicles && vehicles.length > 0 ? (
            <VehicleInspectionTable vehicles={vehicles} />
          ) : (
            <div className="flex flex-col items-center justify-center py-16 px-4">
              <div className="p-4 rounded-2xl bg-muted/50 mb-4">
                <ClipboardCheck className="w-10 h-10 text-muted-foreground/50" />
              </div>
              <h3 className="text-lg font-medium text-foreground mb-1">Nenhum veículo cadastrado</h3>
              <p className="text-sm text-muted-foreground text-center mb-4">
                Adicione seu primeiro veículo para começar o controle de vistorias
              </p>
              <Button onClick={() => setAddDialogOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" /> Adicionar Veículo
              </Button>
            </div>
          )}
        </div>

        {/* Add Dialog */}
        <AddVehicleDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      </div>
    </Layout>
  );
};

export default VistoriasEquipamentos;
