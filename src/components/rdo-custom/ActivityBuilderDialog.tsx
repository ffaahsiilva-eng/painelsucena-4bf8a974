import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  ICON_NAMES,
  COLOR_PRESETS,
  UNIT_OPTIONS,
  getIconComponent,
  type ActivityConfig,
  type ActivityField,
  type CustomActivityDefinition,
} from "@/lib/customActivity";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: CustomActivityDefinition | null;
  onSubmit: (data: { title: string; icon: string; color: string; config: ActivityConfig }) => Promise<void> | void;
}

function emptyField(): ActivityField {
  return {
    id: crypto.randomUUID(),
    name: "",
    mode: "input",
    unit: "Unidade",
    locations: [],
    allowCustomLocation: true,
  };
}

export function ActivityBuilderDialog({ open, onOpenChange, initial, onSubmit }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [title, setTitle] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [color, setColor] = useState("amber");
  const [fields, setFields] = useState<ActivityField[]>([emptyField()]);
  const [locDrafts, setLocDrafts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setTitle(initial.title);
      setIcon(initial.icon);
      setColor(initial.color);
      setFields(initial.config?.fields?.length ? initial.config.fields : [emptyField()]);
    } else {
      setTitle("");
      setIcon("Sparkles");
      setColor("amber");
      setFields([emptyField()]);
    }
    setStep(1);
    setLocDrafts({});
  }, [open, initial]);

  const updateField = (id: string, patch: Partial<ActivityField>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };
  const removeField = (id: string) => setFields((prev) => prev.filter((f) => f.id !== id));

  const addLocation = (fieldId: string) => {
    const raw = (locDrafts[fieldId] ?? "").trim();
    if (!raw) return;
    setFields((prev) =>
      prev.map((f) =>
        f.id === fieldId && !f.locations.includes(raw)
          ? { ...f, locations: [...f.locations, raw] }
          : f,
      ),
    );
    setLocDrafts((d) => ({ ...d, [fieldId]: "" }));
  };

  const handleSubmit = async () => {
    const t = title.trim();
    if (!t) {
      toast.error("Informe o título da atividade");
      setStep(1);
      return;
    }
    const cleanFields = fields
      .map((f) => ({ ...f, name: f.name.trim() }))
      .filter((f) => f.name.length > 0);
    if (cleanFields.length === 0) {
      toast.error("Adicione ao menos um campo");
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      await onSubmit({ title: t, icon, color, config: { fields: cleanFields } });
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || ""));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial ? "Editar Atividade" : "Nova Atividade"}</DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2 text-xs">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn(
              "px-3 py-1.5 rounded-full transition-colors",
              step === 1 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            1. Cabeçalho
          </button>
          <div className="h-px flex-1 bg-border" />
          <button
            type="button"
            onClick={() => setStep(2)}
            className={cn(
              "px-3 py-1.5 rounded-full transition-colors",
              step === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground",
            )}
          >
            2. Campos
          </button>
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="act-title">Título</Label>
              <Input
                id="act-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Drenagem Superficial"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label>Ícone</Label>
              <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
                {ICON_NAMES.map((name) => {
                  const I = getIconComponent(name);
                  const selected = icon === name;
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setIcon(name)}
                      className={cn(
                        "aspect-square rounded-lg border flex items-center justify-center transition-all",
                        selected ? "border-primary bg-primary/10 scale-105" : "border-border hover:bg-muted",
                      )}
                      title={name}
                    >
                      <I className="h-5 w-5" />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cor de destaque</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_PRESETS.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setColor(c.key)}
                    className={cn(
                      "h-9 px-3 rounded-full border flex items-center gap-2 text-xs font-medium transition-all",
                      color === c.key ? "border-foreground scale-105" : "border-border",
                    )}
                    style={{ background: `linear-gradient(135deg, ${c.from}, ${c.to})`, color: "#0a0a0a" }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Configure os campos que aparecerão na página de preenchimento diário.
            </p>

            <div className="space-y-3">
              {fields.map((f, idx) => (
                <div key={f.id} className="rounded-lg border border-border p-3 space-y-3 bg-card">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-muted-foreground">#{idx + 1}</span>
                    <Input
                      value={f.name}
                      onChange={(e) => updateField(f.id, { name: e.target.value })}
                      placeholder="Nome do campo (ex: ROÇAGEM)"
                      className="flex-1"
                    />
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeField(f.id)}
                        title="Remover campo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Modo</Label>
                      <Select
                        value={f.mode}
                        onValueChange={(v) => updateField(f.id, { mode: v as "input" | "check" })}
                      >
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="input">Preenchimento (número)</SelectItem>
                          <SelectItem value="check">Marcação (feito/não feito)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {f.mode === "input" && (
                      <div className="space-y-1.5">
                        <Label className="text-xs">Unidade</Label>
                        <div className="flex gap-2">
                          <Select
                            value={UNIT_OPTIONS.includes(f.unit ?? "") ? (f.unit as string) : "__custom"}
                            onValueChange={(v) =>
                              updateField(f.id, { unit: v === "__custom" ? (f.unit && !UNIT_OPTIONS.includes(f.unit) ? f.unit : "") : v })
                            }
                          >
                            <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {UNIT_OPTIONS.map((u) => (
                                <SelectItem key={u} value={u}>{u}</SelectItem>
                              ))}
                              <SelectItem value="__custom">Outra…</SelectItem>
                            </SelectContent>
                          </Select>
                          {!UNIT_OPTIONS.includes(f.unit ?? "") && (
                            <Input
                              value={f.unit ?? ""}
                              onChange={(e) => updateField(f.id, { unit: e.target.value })}
                              placeholder="Outra"
                              className="w-24"
                            />
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Locais</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {f.locations.map((loc) => (
                        <span
                          key={loc}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-muted text-xs"
                        >
                          {loc}
                          <button
                            type="button"
                            onClick={() =>
                              updateField(f.id, {
                                locations: f.locations.filter((l) => l !== loc),
                              })
                            }
                            className="hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={locDrafts[f.id] ?? ""}
                        onChange={(e) => setLocDrafts((d) => ({ ...d, [f.id]: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addLocation(f.id);
                          }
                        }}
                        placeholder="Ex: Faixa 1, Berma A, Trecho 3…"
                        className="flex-1"
                      />
                      <Button type="button" variant="outline" onClick={() => addLocation(f.id)}>
                        Adicionar
                      </Button>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Switch
                        id={`custom-loc-${f.id}`}
                        checked={f.allowCustomLocation}
                        onCheckedChange={(v) => updateField(f.id, { allowCustomLocation: v })}
                      />
                      <Label htmlFor={`custom-loc-${f.id}`} className="text-xs cursor-pointer">
                        Permitir digitar local manualmente
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => setFields((prev) => [...prev, emptyField()])}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Adicionar campo
            </Button>
          </div>
        )}

        <DialogFooter className="flex-wrap gap-2">
          {step === 2 && (
            <Button variant="outline" onClick={() => setStep(1)} disabled={saving}>
              Voltar
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!title.trim()}>
              Continuar
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? "Salvando..." : initial ? "Atualizar" : "Criar Atividade"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
