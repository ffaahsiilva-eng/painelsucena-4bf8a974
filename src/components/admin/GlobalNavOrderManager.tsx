import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GripVertical, LayoutList, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const NAV_ITEMS_MAP: Record<string, string> = {
  "rdo-hub": "Relatório Diário Obra",
  "meio-ambiente": "Meio Ambiente",
  "destaques": "Destaques",
  "seguranca": "Segurança",
  "almoxarifado": "Almoxarifado",
  "equipamentos": "Equipamentos",
  "rh-hub": "RH",
  "lembretes": "Lembretes",
  "arquivos-seguranca": "Documentos",
  "instacena": "InstaCena",
  "planejamento": "Planejamento",
  "emergencia": "Emergência",
};

const DEFAULT_NAV_ORDER = [
  "rdo-hub", "meio-ambiente", "destaques", "seguranca", "almoxarifado",
  "equipamentos", "rh-hub", "lembretes", "arquivos-seguranca",
  "instacena", "planejamento", "emergencia"
];

function SortableNavItem({ id, label }: { id: string; label: string }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id } as any);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 p-3 bg-card border border-border rounded-lg group hover:bg-accent/50 transition-colors"
    >
      <span
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing p-1 opacity-50 group-hover:opacity-100 transition-opacity"
      >
        <GripVertical className="h-4 w-4 text-muted-foreground" />
      </span>
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}

export function GlobalNavOrderManager() {
  const { settings, updateSettings } = useSiteSettings();
  const [isSaving, setIsSaving] = useState(false);
  
  const [localOrder, setLocalOrder] = useState<string[]>(() => {
    return settings.nav_order && settings.nav_order.length > 0 
      ? settings.nav_order 
      : DEFAULT_NAV_ORDER;
  });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = localOrder.indexOf(active.id as string);
      const newIndex = localOrder.indexOf(over.id as string);
      const newOrder = arrayMove(localOrder, oldIndex, newIndex);
      setLocalOrder(newOrder);
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSettings.mutateAsync({ nav_order: localOrder });
      toast.success("Ordem global do menu salva com sucesso!");
    } catch (error) {
      console.error("Error saving nav order:", error);
      toast.error("Erro ao salvar ordem do menu.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalOrder(DEFAULT_NAV_ORDER);
  };

  const hasChanges = useMemo(() => {
    const currentOrder = settings.nav_order && settings.nav_order.length > 0 
      ? settings.nav_order 
      : DEFAULT_NAV_ORDER;
    return JSON.stringify(localOrder) !== JSON.stringify(currentOrder);
  }, [localOrder, settings.nav_order]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutList className="w-5 h-5" />
          Ordem Global do Menu
        </CardTitle>
        <CardDescription>
          Defina a ordem padrão do menu lateral para todos os usuários. Os usuários podem personalizar a ordem individualmente, mas esta é a ordem padrão inicial.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={localOrder}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {localOrder.map((id) => (
                <SortableNavItem
                  key={id}
                  id={id}
                  label={NAV_ITEMS_MAP[id] || id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <div className="flex items-center gap-2 pt-4 border-t">
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasChanges}
          >
            {isSaving ? "Salvando..." : "Salvar Ordem Global"}
          </Button>
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={isSaving}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Restaurar Padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
