import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export interface ActivityEntry {
  value: string;
  faixa: string;
  berma: string;
}

interface MultiActivityRowProps {
  label: string;
  unit: string;
  entries: ActivityEntry[];
  onChange: (entries: ActivityEntry[]) => void;
  faixaOptions: { value: string; label: string }[];
  bermaOptions: { value: string; label: string }[];
  inputType?: "number" | "text";
  step?: string;
  badge?: React.ReactNode;
  className?: string;
}

export function MultiActivityRow({
  label,
  unit,
  entries,
  onChange,
  faixaOptions,
  bermaOptions,
  inputType = "number",
  step = "1",
  badge,
  className = "bg-muted/30",
}: MultiActivityRowProps) {
  const addEntry = () => {
    onChange([...entries, { value: "", faixa: "", berma: "" }]);
  };

  const removeEntry = (index: number) => {
    if (entries.length <= 1) return;
    onChange(entries.filter((_, i) => i !== index));
  };

  const updateEntry = (index: number, field: keyof ActivityEntry, val: string) => {
    const updated = [...entries];
    updated[index] = { ...updated[index], [field]: val };
    onChange(updated);
  };

  return (
    <div className={`p-3 rounded-lg space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label>{label} ({unit})</Label>
          {badge}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addEntry}
          className="gap-1 h-7 text-xs"
        >
          <Plus className="h-3 w-3" />
          Mais
        </Button>
      </div>
      {entries.map((entry, index) => (
        <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_130px_130px_auto] gap-2 items-end">
          <Input
            type={inputType}
            min="0"
            step={step}
            value={entry.value}
            onChange={(e) => updateEntry(index, "value", e.target.value)}
            placeholder="0"
          />
          <Select value={entry.faixa} onValueChange={(v) => updateEntry(index, "faixa", v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Faixa" />
            </SelectTrigger>
            <SelectContent>
              {faixaOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={entry.berma} onValueChange={(v) => updateEntry(index, "berma", v)}>
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Berma" />
            </SelectTrigger>
            <SelectContent>
              {bermaOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {entries.length > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-9 w-9 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => removeEntry(index)}
            >
              <X className="h-4 w-4" />
            </Button>
          ) : (
            <div className="w-9" />
          )}
        </div>
      ))}
    </div>
  );
}

// Helper: sum all values, take first non-empty faixa/berma
export function aggregateEntries(entries: ActivityEntry[]): {
  totalValue: number;
  faixa: string;
  berma: string;
} {
  let total = 0;
  let faixa = "";
  let berma = "";
  for (const e of entries) {
    const v = parseFloat(e.value);
    if (!isNaN(v) && v > 0) total += v;
    if (!faixa && e.faixa) faixa = e.faixa;
    if (!berma && e.berma) berma = e.berma;
  }
  return { totalValue: total, faixa, berma };
}

// Helper: generate preview lines for multi-entries
export function generateMultiEntryPreviewLines(
  entries: ActivityEntry[],
  activityName: string,
  unit: string,
): string[] {
  const lines: string[] = [];
  for (const entry of entries) {
    const v = parseFloat(entry.value);
    if (!isNaN(v) && v > 0) {
      let line = `* ${activityName} - ${entry.value} ${unit}`;
      if (entry.berma) line += ` (Berma ${entry.berma})`;
      if (entry.faixa) line += ` - ${entry.faixa}`;
      lines.push(line);
    }
  }
  return lines;
}
