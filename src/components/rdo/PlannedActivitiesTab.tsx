import { useState, useMemo, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { MessageCircle, Copy, Loader2, CheckCircle2, Leaf, Hammer, Lock, Save, Unlock, Plus, X } from "lucide-react";
import { getIconComponent, type CustomActivityDefinition } from "@/lib/customActivity";

import { toast } from "sonner";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface CustomPlannedEntry {
  items: string[];
  manual: string[];
  location?: string;
}


interface PlannedActivitiesTabProps {
  selectedDate: Date;
  gabiaoActivities: string[];
  jardinagemActivities: string[];
  customDefinitions?: CustomActivityDefinition[];
  showGabiao?: boolean;
  showJardinagem?: boolean;
  initialPlanned?: { 
    gabiao: string[]; 
    jardinagem: string[];
    faixa_jardinagem?: string;
    faixa_gabiao?: string;
    unidade_gabiao?: string;
    manual_jardinagem?: string;
    manual_gabiao?: string;
    manual_jardinagem_list?: string[];
    manual_gabiao_list?: string[];
    custom?: Record<string, CustomPlannedEntry>;
  } | null;
  initialLocks?: { gabiao: boolean; jardinagem: boolean };
  onSave: (planned: any, locks?: { gabiao?: boolean; jardinagem?: boolean }, area?: "gabiao" | "jardinagem") => Promise<void>;
  isSaving?: boolean;
  canEdit?: boolean;
  isAdmin?: boolean;
}


const toManualList = (list?: string[], legacy?: string): string[] => {
  if (Array.isArray(list) && list.length > 0) return list;
  if (legacy && legacy.trim()) return [legacy];
  return [""];
};

export function PlannedActivitiesTab({
  selectedDate,
  gabiaoActivities,
  jardinagemActivities,
  customDefinitions = [],
  showGabiao = true,
  showJardinagem = true,
  initialPlanned,
  initialLocks,
  onSave,
  isSaving = false,
  canEdit = true,
  isAdmin = false,
}: PlannedActivitiesTabProps) {
  const [plannedGabiao, setPlannedGabiao] = useState<string[]>(initialPlanned?.gabiao || []);
  const [plannedJardinagem, setPlannedJardinagem] = useState<string[]>(initialPlanned?.jardinagem || []);
  const [faixaJardinagem, setFaixaJardinagem] = useState<string>(initialPlanned?.faixa_jardinagem || "");
  const [faixaGabiao, setFaixaGabiao] = useState<string>(initialPlanned?.faixa_gabiao || "");
  const [unidadeGabiao, setUnidadeGabiao] = useState<string>(initialPlanned?.unidade_gabiao || "");
  const [manualJardinagemList, setManualJardinagemList] = useState<string[]>(toManualList(initialPlanned?.manual_jardinagem_list, initialPlanned?.manual_jardinagem));
  const [manualGabiaoList, setManualGabiaoList] = useState<string[]>(toManualList(initialPlanned?.manual_gabiao_list, initialPlanned?.manual_gabiao));
  const [isGabiaoLocked, setIsGabiaoLocked] = useState(initialLocks?.gabiao || false);
  const [isJardinagemLocked, setIsJardinagemLocked] = useState(initialLocks?.jardinagem || false);
  const [showConfirmGabiao, setShowConfirmGabiao] = useState(false);
  const [showConfirmJardinagem, setShowConfirmJardinagem] = useState(false);
  const [customPlanned, setCustomPlanned] = useState<Record<string, CustomPlannedEntry>>(
    initialPlanned?.custom || {}
  );

  useEffect(() => {
    setPlannedGabiao(initialPlanned?.gabiao || []);
    setPlannedJardinagem(initialPlanned?.jardinagem || []);
    setFaixaJardinagem(initialPlanned?.faixa_jardinagem || "");
    setFaixaGabiao(initialPlanned?.faixa_gabiao || "");
    setUnidadeGabiao(initialPlanned?.unidade_gabiao || "");
    setManualJardinagemList(toManualList(initialPlanned?.manual_jardinagem_list, initialPlanned?.manual_jardinagem));
    setManualGabiaoList(toManualList(initialPlanned?.manual_gabiao_list, initialPlanned?.manual_gabiao));
    setIsGabiaoLocked(initialLocks?.gabiao || false);
    setIsJardinagemLocked(initialLocks?.jardinagem || false);
    setCustomPlanned(initialPlanned?.custom || {});
  }, [initialPlanned, initialLocks]);


  const cleanManualJardinagem = manualJardinagemList.map(s => s.trim()).filter(Boolean);
  const cleanManualGabiao = manualGabiaoList.map(s => s.trim()).filter(Boolean);
  const manualJardinagem = cleanManualJardinagem.join(" | ");
  const manualGabiao = cleanManualGabiao.join(" | ");

  const updateManual = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    idx: number,
    value: string
  ) => setter(prev => prev.map((v, i) => (i === idx ? value : v)));

  const addManual = (setter: React.Dispatch<React.SetStateAction<string[]>>) =>
    setter(prev => [...prev, ""]);

  const removeManual = (setter: React.Dispatch<React.SetStateAction<string[]>>, idx: number) =>
    setter(prev => prev.length <= 1 ? [""] : prev.filter((_, i) => i !== idx));

  const toggleGabiao = (activity: string) => {
    if (!canEdit || isGabiaoLocked) return;
    setPlannedGabiao(prev => 
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  };

  const toggleJardinagem = (activity: string) => {
    if (!canEdit || isJardinagemLocked) return;
    setPlannedJardinagem(prev => 
      prev.includes(activity) ? prev.filter(a => a !== activity) : [...prev, activity]
    );
  };

  const toggleCustomItem = (defId: string, item: string) => {
    if (!canEdit) return;
    setCustomPlanned((prev) => {
      const cur = prev[defId] || { items: [], manual: [] };
      const has = cur.items.includes(item);
      return {
        ...prev,
        [defId]: {
          ...cur,
          items: has ? cur.items.filter((i) => i !== item) : [...cur.items, item],
        },
      };
    });
  };

  const setCustomManual = (defId: string, idx: number, value: string) => {
    setCustomPlanned((prev) => {
      const cur = prev[defId] || { items: [], manual: [""] };
      const manual = cur.manual.length ? [...cur.manual] : [""];
      manual[idx] = value;
      return { ...prev, [defId]: { ...cur, manual } };
    });
  };

  const addCustomManual = (defId: string) => {
    setCustomPlanned((prev) => {
      const cur = prev[defId] || { items: [], manual: [""] };
      return { ...prev, [defId]: { ...cur, manual: [...cur.manual, ""] } };
    });
  };

  const removeCustomManual = (defId: string, idx: number) => {
    setCustomPlanned((prev) => {
      const cur = prev[defId] || { items: [], manual: [""] };
      const manual = cur.manual.length <= 1 ? [""] : cur.manual.filter((_, i) => i !== idx);
      return { ...prev, [defId]: { ...cur, manual } };
    });
  };

  const generatePreview = () => {
    const lines: string[] = ["📋 ATIVIDADES PREVISTAS", ""];
    
    if (showGabiao && (plannedGabiao.length > 0 || cleanManualGabiao.length > 0)) {
      lines.push("🏗️ GABIÃO");
      if (faixaGabiao) lines.push(`📍 Faixa: ${faixaGabiao}`);
      if (unidadeGabiao) lines.push(`🧱 Unidade: ${unidadeGabiao}`);
      plannedGabiao.forEach(a => lines.push(`✅ ${a}`));
      cleanManualGabiao.forEach(a => lines.push(`📝 ${a}`));
      lines.push("");
    }

    if (showJardinagem && (plannedJardinagem.length > 0 || cleanManualJardinagem.length > 0)) {
      lines.push("🌱 JARDINAGEM");
      if (faixaJardinagem) lines.push(`📍 Faixa: ${faixaJardinagem}`);
      plannedJardinagem.forEach(a => lines.push(`✅ ${a}`));
      cleanManualJardinagem.forEach(a => lines.push(`📝 ${a}`));
      lines.push("");
    }

    customDefinitions.forEach((def) => {
      const entry = customPlanned[def.id];
      const items = entry?.items || [];
      const manual = (entry?.manual || []).map((s) => s.trim()).filter(Boolean);
      const location = (entry?.location || "").trim();
      if (items.length === 0 && manual.length === 0) return;
      lines.push(`🏷️ ${def.title.toUpperCase()}`);
      if (location) lines.push(`📍 Local: ${location}`);
      items.forEach((a) => lines.push(`✅ ${a}`));
      manual.forEach((a) => lines.push(`📝 ${a}`));
      lines.push("");
    });


    lines.push(`Data: ${format(selectedDate, "dd/MM/yyyy")}`);
    return lines.join("\n");
  };


  const getPlannedData = () => {
    // Clean custom manual entries
    const cleanedCustom: Record<string, CustomPlannedEntry> = {};
    Object.entries(customPlanned).forEach(([defId, entry]) => {
      const manual = (entry.manual || []).map((s) => s.trim()).filter(Boolean);
      const location = (entry.location || "").trim();
      if ((entry.items || []).length > 0 || manual.length > 0) {
        cleanedCustom[defId] = { items: entry.items || [], manual, location };
      }
    });

    return {
      gabiao: plannedGabiao,
      jardinagem: plannedJardinagem,
      faixa_jardinagem: faixaJardinagem,
      faixa_gabiao: faixaGabiao,
      unidade_gabiao: unidadeGabiao,
      manual_jardinagem: manualJardinagem,
      manual_gabiao: manualGabiao,
      manual_jardinagem_list: cleanManualJardinagem,
      manual_gabiao_list: cleanManualGabiao,
      custom: cleanedCustom,
    };
  };


  const handleWhatsApp = async () => {
    const text = generatePreview();
    const ok = await copyAndShareWhatsApp(text);
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopy = async () => {
    const text = generatePreview();
    const ok = await copyToClipboard(text);
    if (ok) toast.success("Mensagem copiada!");
    else toast.error("Erro ao copiar");
  };

  const handleConfirmSaveGabiao = async () => {
    await onSave(getPlannedData(), { gabiao: true }, "gabiao");
    setShowConfirmGabiao(false);
  };

  const handleConfirmSaveJardinagem = async () => {
    await onSave(getPlannedData(), { jardinagem: true }, "jardinagem");
    setShowConfirmJardinagem(false);
  };

  const handleUnlockGabiao = async () => {
    if (!canEdit) return;
    await onSave(getPlannedData(), { gabiao: false });
    toast.info("Atividades de Gabião desbloqueadas");
  };

  const handleUnlockJardinagem = async () => {
    if (!canEdit) return;
    await onSave(getPlannedData(), { jardinagem: false });
    toast.info("Atividades de Jardinagem desbloqueadas");
  };

  const handleSaveInternal = async () => {
    await onSave(getPlannedData());
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        {/* Jardinagem Section */}
        {showJardinagem && (

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Leaf className="h-5 w-5 text-green-500" />
                Jardinagem
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {isJardinagemLocked && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUnlockJardinagem}
                      className="h-8 gap-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      Desbloquear
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant={isJardinagemLocked ? "secondary" : "default"}
                    disabled={isJardinagemLocked || isSaving}
                    onClick={() => setShowConfirmJardinagem(true)}
                    className="h-8 gap-1"
                  >
                    {isJardinagemLocked ? <Lock className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    {isJardinagemLocked ? "Bloqueado" : "Salvar"}
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>Selecione as atividades previstas para jardinagem</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn("grid grid-cols-1 gap-4", isJardinagemLocked && "opacity-60 pointer-events-none")}>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Faixa</Label>
                <Select value={faixaJardinagem} onValueChange={setFaixaJardinagem} disabled={isJardinagemLocked}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a Faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAIXA 2">FAIXA 2</SelectItem>
                    <SelectItem value="FAIXA 3">FAIXA 3</SelectItem>
                    <SelectItem value="FAIXA 4">FAIXA 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Outras atividades (Preenchimento Manual)</Label>
                {manualJardinagemList.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={val}
                      onChange={(e) => updateManual(setManualJardinagemList, idx, e.target.value)}
                      placeholder="Descreva outra atividade..."
                      disabled={isJardinagemLocked}
                    />
                    {manualJardinagemList.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeManual(setManualJardinagemList, idx)}
                        disabled={isJardinagemLocked}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addManual(setManualJardinagemList)}
                  disabled={isJardinagemLocked}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Adicionar atividade
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] pr-4">
              <div className={cn("space-y-2", isJardinagemLocked && "opacity-60 pointer-events-none")}>
                {jardinagemActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma atividade base encontrada.</p>
                ) : (
                  jardinagemActivities.map((activity, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md transition-colors",
                        !isJardinagemLocked && "hover:bg-muted/50 cursor-pointer"
                      )}
                      onClick={() => !isJardinagemLocked && toggleJardinagem(activity)}
                    >
                      <Checkbox 
                        id={`jard-${i}`} 
                        checked={plannedJardinagem.includes(activity)}
                        onCheckedChange={() => !isJardinagemLocked && toggleJardinagem(activity)}
                        disabled={!canEdit || isJardinagemLocked}
                      />
                      <Label htmlFor={`jard-${i}`} className={cn("text-sm flex-1 leading-tight", !isJardinagemLocked && "cursor-pointer")}>
                        {activity}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        )}

        {/* Gabião Section */}
        {showGabiao && (
        <Card>

          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hammer className="h-5 w-5 text-orange-500" />
                Gabião
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  {isGabiaoLocked && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleUnlockGabiao}
                      className="h-8 gap-1 border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                    >
                      <Unlock className="h-3.5 w-3.5" />
                      Desbloquear
                    </Button>
                  )}
                  <Button 
                    size="sm" 
                    variant={isGabiaoLocked ? "secondary" : "default"}
                    disabled={isGabiaoLocked || isSaving}
                    onClick={() => setShowConfirmGabiao(true)}
                    className="h-8 gap-1"
                  >
                    {isGabiaoLocked ? <Lock className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
                    {isGabiaoLocked ? "Bloqueado" : "Salvar"}
                  </Button>
                </div>
              )}
            </CardTitle>
            <CardDescription>Selecione as atividades previstas para gabião</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className={cn("grid grid-cols-2 gap-4", isGabiaoLocked && "opacity-60 pointer-events-none")}>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Faixa</Label>
                <Select value={faixaGabiao} onValueChange={setFaixaGabiao} disabled={isGabiaoLocked}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione a Faixa" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FAIXA 2">FAIXA 2</SelectItem>
                    <SelectItem value="FAIXA 3">FAIXA 3</SelectItem>
                    <SelectItem value="FAIXA 4">FAIXA 4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">Gabião</Label>
                <Select value={unidadeGabiao} onValueChange={setUnidadeGabiao} disabled={isGabiaoLocked}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o Gabião" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gabião 1">Gabião 1</SelectItem>
                    <SelectItem value="Gabião 2">Gabião 2</SelectItem>
                    <SelectItem value="Gabião 3">Gabião 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 col-span-2">
                <Label className="text-sm font-medium">Outras atividades (Preenchimento Manual)</Label>
                {manualGabiaoList.map((val, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={val}
                      onChange={(e) => updateManual(setManualGabiaoList, idx, e.target.value)}
                      placeholder="Descreva outra atividade..."
                      disabled={isGabiaoLocked}
                    />
                    {manualGabiaoList.length > 1 && (
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeManual(setManualGabiaoList, idx)}
                        disabled={isGabiaoLocked}
                        className="shrink-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => addManual(setManualGabiaoList)}
                  disabled={isGabiaoLocked}
                  className="gap-1"
                >
                  <Plus className="h-4 w-4" /> Adicionar atividade
                </Button>
              </div>
            </div>

            <ScrollArea className="h-[250px] pr-4">
              <div className={cn("space-y-2", isGabiaoLocked && "opacity-60 pointer-events-none")}>
                {gabiaoActivities.length === 0 ? (
                  <p className="text-sm text-muted-foreground italic py-4 text-center">Nenhuma atividade base encontrada.</p>
                ) : (
                  gabiaoActivities.map((activity, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex items-center space-x-3 p-2 rounded-md transition-colors",
                        !isGabiaoLocked && "hover:bg-muted/50 cursor-pointer"
                      )}
                      onClick={() => !isGabiaoLocked && toggleGabiao(activity)}
                    >
                      <Checkbox 
                        id={`gab-${i}`} 
                        checked={plannedGabiao.includes(activity)}
                        onCheckedChange={() => !isGabiaoLocked && toggleGabiao(activity)}
                        disabled={!canEdit || isGabiaoLocked}
                      />
                      <Label htmlFor={`gab-${i}`} className={cn("text-sm flex-1 leading-tight", !isGabiaoLocked && "cursor-pointer")}>
                        {activity}
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
        )}

        {/* Custom Activity Sections (per definition) */}
        {customDefinitions.map((def) => {
          const Icon = getIconComponent(def.icon);
          const entry = customPlanned[def.id] || { items: [], manual: [""], location: "" };
          const manualList = entry.manual.length ? entry.manual : [""];
          const items = Array.from(new Set(def.config.fields.map((f) => f.name).filter(Boolean)));
          const locationOptions = Array.from(
            new Set(def.config.fields.flatMap((f) => f.locations || []).filter(Boolean))
          );
          return (
            <Card key={def.id}>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {def.title}
                </CardTitle>
                <CardDescription>Selecione as atividades previstas para {def.title}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Local</Label>
                  {locationOptions.length > 0 ? (
                    <div className="flex gap-2">
                      <Select
                        value={entry.location || ""}
                        onValueChange={(v) =>
                          setCustomPlanned((prev) => ({
                            ...prev,
                            [def.id]: { ...(prev[def.id] || { items: [], manual: [""] }), location: v },
                          }))
                        }
                        disabled={!canEdit}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Selecione o local..." />
                        </SelectTrigger>
                        <SelectContent>
                          {locationOptions.map((loc) => (
                            <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={entry.location || ""}
                        onChange={(e) =>
                          setCustomPlanned((prev) => ({
                            ...prev,
                            [def.id]: { ...(prev[def.id] || { items: [], manual: [""] }), location: e.target.value },
                          }))
                        }
                        placeholder="Ou digite..."
                        disabled={!canEdit}
                        className="flex-1"
                      />
                    </div>
                  ) : (
                    <Input
                      value={entry.location || ""}
                      onChange={(e) =>
                        setCustomPlanned((prev) => ({
                          ...prev,
                          [def.id]: { ...(prev[def.id] || { items: [], manual: [""] }), location: e.target.value },
                        }))
                      }
                      placeholder="Ex.: Faixa 2, Berma 3..."
                      disabled={!canEdit}
                    />
                  )}
                </div>

                <ScrollArea className="max-h-[250px] pr-4">
                  <div className="space-y-2">
                    {items.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic py-4 text-center">
                        Nenhum campo cadastrado nesta atividade.
                      </p>
                    ) : (
                      items.map((it, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex items-center space-x-3 p-2 rounded-md transition-colors",
                            canEdit && "hover:bg-muted/50 cursor-pointer"
                          )}
                          onClick={() => toggleCustomItem(def.id, it)}
                        >
                          <Checkbox
                            id={`cst-${def.id}-${i}`}
                            checked={entry.items.includes(it)}
                            onCheckedChange={() => toggleCustomItem(def.id, it)}
                            disabled={!canEdit}
                          />
                          <Label htmlFor={`cst-${def.id}-${i}`} className={cn("text-sm flex-1 leading-tight", canEdit && "cursor-pointer")}>
                            {it}
                          </Label>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Outras atividades (Preenchimento Manual)</Label>

                  {manualList.map((val, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={val}
                        onChange={(e) => setCustomManual(def.id, idx, e.target.value)}
                        placeholder="Descreva outra atividade..."
                        disabled={!canEdit}
                      />
                      {manualList.length > 1 && (
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeCustomManual(def.id, idx)}
                          disabled={!canEdit}
                          className="shrink-0"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => addCustomManual(def.id)}
                    disabled={!canEdit}
                    className="gap-1"
                  >
                    <Plus className="h-4 w-4" /> Adicionar atividade
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {canEdit && (

          <Button 
            onClick={handleSaveInternal} 
            disabled={isSaving || (isGabiaoLocked && isJardinagemLocked)} 
            className="w-full"
            variant="outline"
          >
            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
            Salvar Tudo
          </Button>
        )}
      </div>

      {/* Confirmation Dialogs */}
      <AlertDialog open={showConfirmGabiao} onOpenChange={setShowConfirmGabiao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar bloqueio de Gabião?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao salvar e bloquear, as atividades de Gabião não poderão mais ser alteradas.
              <div className="mt-4 p-3 bg-muted rounded-md border text-foreground text-sm">
                <p className="font-semibold mb-2">Atividades selecionadas:</p>
                {plannedGabiao.length > 0 || manualGabiao ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {plannedGabiao.map((a, i) => <li key={i}>{a}</li>)}
                    {manualGabiao && <li className="italic">{manualGabiao} (Outros)</li>}
                  </ul>
                ) : (
                  <p className="italic text-muted-foreground">Nenhuma atividade selecionada.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSaveGabiao}>Sim, Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showConfirmJardinagem} onOpenChange={setShowConfirmJardinagem}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar bloqueio de Jardinagem?</AlertDialogTitle>
            <AlertDialogDescription>
              Ao salvar e bloquear, as atividades de Jardinagem não poderão mais ser alteradas.
              <div className="mt-4 p-3 bg-muted rounded-md border text-foreground text-sm">
                <p className="font-semibold mb-2">Atividades selecionadas:</p>
                {plannedJardinagem.length > 0 || manualJardinagem ? (
                  <ul className="list-disc pl-5 space-y-1">
                    {plannedJardinagem.map((a, i) => <li key={i}>{a}</li>)}
                    {manualJardinagem && <li className="italic">{manualJardinagem} (Outros)</li>}
                  </ul>
                ) : (
                  <p className="italic text-muted-foreground">Nenhuma atividade selecionada.</p>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Não</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmSaveJardinagem}>Sim, Bloquear</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Preview Column */}
      <div className="space-y-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              Preview da Mensagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-muted p-4 rounded-lg font-mono text-sm min-h-[400px] whitespace-pre-wrap">
              {generatePreview()}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={handleWhatsApp} className="gap-2">
                <MessageCircle className="h-4 w-4 text-[#25D366]" />
                WhatsApp
              </Button>
              <Button variant="outline" onClick={handleCopy} className="gap-2">
                <Copy className="h-4 w-4" />
                Copiar Mensagem
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
