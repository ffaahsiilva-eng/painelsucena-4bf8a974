import { useState, useRef, useEffect } from "react";
import { Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePageCustomizations } from "@/hooks/usePageCustomizations";
import { toast } from "sonner";

interface EditableTextProps {
  pageKey: string;
  elementKey: string;
  defaultValue: string;
  className?: string;
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span";
  canEdit: boolean;
}

export const EditableText = ({
  pageKey,
  elementKey,
  defaultValue,
  className,
  as: Tag = "span",
  canEdit,
}: EditableTextProps) => {
  const { getCustomValue, upsertCustomization } = usePageCustomizations(pageKey);
  const customValue = getCustomValue(elementKey, "text");
  const displayValue = customValue ?? defaultValue;

  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(displayValue);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(displayValue);
  }, [displayValue]);

  const handleSave = () => {
    if (editValue.trim() === "") {
      toast.error("O texto não pode ficar vazio");
      return;
    }
    upsertCustomization.mutate(
      {
        page_key: pageKey,
        element_key: elementKey,
        element_type: "text",
        text_value: editValue.trim() === defaultValue ? null : editValue.trim(),
      },
      {
        onSuccess: () => {
          toast.success("Texto atualizado!");
          setIsEditing(false);
        },
        onError: () => toast.error("Erro ao salvar"),
      }
    );
  };

  const handleCancel = () => {
    setEditValue(displayValue);
    setIsEditing(false);
  };

  if (!canEdit) {
    return <Tag className={className}>{displayValue}</Tag>;
  }

  if (isEditing) {
    return (
      <span className="inline-flex items-center gap-1">
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSave();
            if (e.key === "Escape") handleCancel();
          }}
          className="bg-background border border-primary rounded px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
          style={{ fontSize: "inherit", fontWeight: "inherit" }}
        />
        <button onClick={handleSave} className="p-1 rounded hover:bg-primary/20 text-primary" title="Salvar">
          <Check className="w-4 h-4" />
        </button>
        <button onClick={handleCancel} className="p-1 rounded hover:bg-destructive/20 text-destructive" title="Cancelar">
          <X className="w-4 h-4" />
        </button>
      </span>
    );
  }

  return (
    <Tag
      className={cn(className, "group cursor-pointer relative inline-flex items-center gap-1 hover:ring-2 hover:ring-primary/40 hover:ring-offset-2 rounded transition-all")}
      onClick={() => setIsEditing(true)}
      title="Clique para editar"
    >
      {displayValue}
      <Pencil className="w-3 h-3 opacity-0 group-hover:opacity-70 text-primary transition-opacity flex-shrink-0" />
    </Tag>
  );
};
