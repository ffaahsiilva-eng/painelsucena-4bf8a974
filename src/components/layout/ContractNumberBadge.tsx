import { useState } from "react";
import { Pencil, FileText } from "lucide-react";
import { useIsAdmin } from "@/hooks/useUserRole";
import { usePageCustomizations } from "@/hooks/usePageCustomizations";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export function ContractNumberBadge() {
  const { isAdmin } = useIsAdmin();
  const { getCustomValue, upsertCustomization } = usePageCustomizations("global");
  const contract = getCustomValue("contract_number", "text");
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const openDialog = () => {
    setValue(contract || "");
    setOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await upsertCustomization.mutateAsync({
        page_key: "global",
        element_key: "contract_number",
        element_type: "text",
        text_value: value.trim() || null,
      });
      toast.success("Contrato atualizado");
      setOpen(false);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  if (!contract) {
    if (!isAdmin) return null;
    return (
      <button
        type="button"
        onClick={openDialog}
        title="Adicionar número do contrato"
        aria-label="Adicionar número do contrato"
        className="pointer-events-auto select-none absolute left-1/2 -translate-x-1/2 -top-3 h-16 w-16 rounded-full bg-sidebar-accent/40 hover:bg-sidebar-accent/60 flex items-center justify-center z-40 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] transition-colors"
      >
        <Pencil className="h-5 w-5 text-sidebar-foreground/80" />
        <EditDialog open={open} onOpenChange={setOpen} value={value} setValue={setValue} onSave={handleSave} saving={saving} />
      </button>
    );
  }

  return (
    <div className="pointer-events-none select-none absolute left-1/2 -translate-x-1/2 -top-3 z-40 flex flex-col items-center drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)] max-w-[calc(100%-1rem)]">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-sidebar-foreground/70 font-semibold whitespace-nowrap">
        <FileText className="h-2.5 w-2.5 shrink-0" />
        Contrato
      </div>
      <div className="relative flex items-center justify-center max-w-full">
        <span className="text-sidebar-foreground font-bold text-sm leading-none tabular-nums whitespace-nowrap truncate max-w-[160px]">{contract}</span>
        {isAdmin && (
          <button
            type="button"
            onClick={openDialog}
            className="pointer-events-auto absolute left-full ml-1 p-0.5 rounded hover:bg-sidebar-accent/50 transition-colors shrink-0"
            title="Editar número do contrato"
            aria-label="Editar número do contrato"
          >
            <Pencil className="h-3 w-3 text-sidebar-foreground/70" />
          </button>
        )}
      </div>
      <EditDialog open={open} onOpenChange={setOpen} value={value} setValue={setValue} onSave={handleSave} saving={saving} />
    </div>
  );
}


function EditDialog({
  open,
  onOpenChange,
  value,
  setValue,
  onSave,
  saving,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  value: string;
  setValue: (v: string) => void;
  onSave: () => void;
  saving: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Número do Contrato</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="contract-number">Contrato</Label>
          <Input
            id="contract-number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="Ex: 4600012345"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={onSave} disabled={saving}>
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
