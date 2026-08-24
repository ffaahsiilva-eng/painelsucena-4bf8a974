import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface ActivityEntry {
  value: string;
  faixa: string;
  berma: string;
  especie?: string;
}

interface EspecieOption {
  especie: string;
  disponivel: number;
}

interface ExtraActivityEntriesProps {
  activityKey: string;
  entries: ActivityEntry[];
  onAdd: (key: string) => void;
  onUpdate: (key: string, index: number, field: keyof ActivityEntry, val: string) => void;
  onRemove: (key: string, index: number) => void;
  faixaOptions: { value: string; label: string }[];
  bermaOptions: { value: string; label: string }[];
  inputType?: string;
  step?: string;
  unit?: string;
  showEspecie?: boolean;
  especiesDisponiveis?: EspecieOption[];
}

export function ExtraActivityEntries({
  activityKey,
  entries,
  onAdd,
  onUpdate,
  onRemove,
  faixaOptions,
  bermaOptions,
  inputType = "number",
  step = "1",
  showEspecie = false,
  especiesDisponiveis = [],
}: ExtraActivityEntriesProps) {
  return (
    <>
      {entries.map((entry, index) => (
        <div key={index} className={`grid grid-cols-1 ${showEspecie ? 'md:grid-cols-[1fr_1fr_140px_140px_auto]' : 'md:grid-cols-[1fr_140px_140px_auto]'} gap-3 items-end mt-2`}>
          {showEspecie && (
            <Select value={entry.especie || ""} onValueChange={(v) => onUpdate(activityKey, index, "especie", v)}>
              <SelectTrigger><SelectValue placeholder="Espécie" /></SelectTrigger>
              <SelectContent>
                {especiesDisponiveis.length === 0 ? (
                  <SelectItem value="__empty" disabled>Sem estoque</SelectItem>
                ) : (
                  especiesDisponiveis.map((e) => (
                    <SelectItem key={e.especie} value={e.especie}>
                      {e.especie} ({e.disponivel} disp.)
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          )}
          <Input
            type={inputType}
            min="0"
            step={step}
            value={entry.value}
            onChange={(e) => onUpdate(activityKey, index, "value", e.target.value)}
            placeholder="0"
          />
          <Select value={entry.faixa} onValueChange={(v) => onUpdate(activityKey, index, "faixa", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Faixa" />
            </SelectTrigger>
            <SelectContent>
              {faixaOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entry.berma || "none"} onValueChange={(v) => onUpdate(activityKey, index, "berma", v === "none" ? "" : v)}>
            <SelectTrigger>
              <SelectValue placeholder="Berma">
                {entry.berma ? bermaOptions.find(o => o.value === entry.berma)?.label : "Berma"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Selecione</SelectItem>
              {bermaOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => onRemove(activityKey, index)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </>
  );
}

export function AddMoreButton({ activityKey, onAdd }: { activityKey: string; onAdd: (key: string) => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => onAdd(activityKey)}
      className="gap-1 h-6 text-xs px-2 text-muted-foreground hover:text-foreground"
    >
      <Plus className="h-3 w-3" />
    </Button>
  );
}
