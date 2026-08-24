import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { ReactNode } from "react";

interface DraggableDashboardItemProps {
  id: string;
  children: ReactNode;
  isEditMode: boolean;
}

export const DraggableDashboardItem = ({
  id,
  children,
  isEditMode,
}: DraggableDashboardItemProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode } as any);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  if (!children) return null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative group ${isDragging ? "opacity-50 z-50" : ""} ${
        !isEditMode && !isDragging ? "cv-auto" : ""
      }`}
    >
      {isEditMode && (
        <button
          className="absolute -left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 rounded-md bg-primary text-primary-foreground shadow-lg cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
      )}
      <div className={isEditMode ? "ring-2 ring-primary/20 rounded-lg" : ""}>
        {children}
      </div>
    </div>
  );
};
