import { Check, X, RotateCcw, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface DashboardEditControlsProps {
  isEditMode: boolean;
  hasChanges: boolean;
  isSaving: boolean;
  onToggleEditMode: () => void;
  onSave: () => void;
  onCancel: () => void;
  onReset: () => void;
}

export const DashboardEditControls = ({
  isEditMode,
  hasChanges,
  isSaving,
  onToggleEditMode,
  onSave,
  onCancel,
  onReset,
}: DashboardEditControlsProps) => {
  if (!isEditMode) {
    return (
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={onToggleEditMode}
      >
        <Settings2 className="h-4 w-4" />
        <span className="hidden sm:inline">Organizar</span>
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-2 p-2 bg-card border rounded-lg shadow-lg animate-fade-in">
      <span className="text-sm text-muted-foreground hidden sm:inline px-2">
        Arraste para reorganizar
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={onReset}
        className="gap-1"
      >
        <RotateCcw className="h-4 w-4" />
        <span className="hidden sm:inline">Padrão</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={onCancel}
        className="gap-1"
      >
        <X className="h-4 w-4" />
        <span className="hidden sm:inline">Cancelar</span>
      </Button>
      <Button
        size="sm"
        onClick={onSave}
        disabled={!hasChanges || isSaving}
        className="gap-1"
      >
        <Check className="h-4 w-4" />
        {isSaving ? "Salvando..." : "Salvar"}
      </Button>
    </div>
  );
};
