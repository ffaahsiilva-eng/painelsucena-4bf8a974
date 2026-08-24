import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Calendar as CalendarIcon,
  Save,
  Lock,
  Unlock,
  Plus,
  Trash2,
  MessageCircle,
  Copy,
  Pencil,
  FileText,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import {
  useCustomActivityDefinition,
  useCustomActivityDailyReport,
  useCustomActivities,
} from "@/hooks/useCustomActivities";
import {
  ActivityBuilderDialog,
} from "@/components/rdo-custom/ActivityBuilderDialog";
import {
  formatCustomActivityForRDO,
  getColor,
  getIconComponent,
  type ActivityEntry,
  type ActivityField,
} from "@/lib/customActivity";
import { copyAndShareWhatsApp, copyToClipboard } from "@/lib/copyAndShare";

function todayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function AtividadeCustom() {
  const { id } = useParams<{ id: string }>();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const { data: def, isLoading } = useCustomActivityDefinition(id);
  const { update } = useCustomActivities();

  const canManage =
    isAdmin ||
    profile?.cargo === "preposto" ||
    profile?.cargo === "encarregado_geral" ||
    profile?.cargo === "encarregado_i" ||
    profile?.cargo === "encarregado_ii";

  const [date, setDate] = useState<Date>(new Date());
  const dateStr = format(date, "yyyy-MM-dd");
  const isTodayReport = dateStr === todayStr();

  const { report, save, setLocked } = useCustomActivityDailyReport(id, dateStr);

  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [editorOpen, setEditorOpen] = useState(false);

  useEffect(() => {
    setEntries(report?.entries ?? []);
  }, [report?.id, dateStr]);

  const locked = report?.locked ?? false;
  const editable = canManage && !locked;

  const color = getColor(def?.color);
  const Icon = getIconComponent(def?.icon);

  const grouped = useMemo(() => {
    const map = new Map<string, ActivityEntry[]>();
    entries.forEach((e) => {
      const arr = map.get(e.field_id) ?? [];
      arr.push(e);
      map.set(e.field_id, arr);
    });
    return map;
  }, [entries]);

  const addRow = (field: ActivityField) => {
    setEntries((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        field_id: field.id,
        value: "",
        location: "",
        note: "",
        checked: false,
      },
    ]);
  };

  const updateRow = (id: string, patch: Partial<ActivityEntry>) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  };

  const removeRow = (id: string) => setEntries((prev) => prev.filter((e) => e.id !== id));

  const ensureAtLeastOne = (field: ActivityField) => {
    if (!grouped.get(field.id)) {
      addRow(field);
    }
  };

  useEffect(() => {
    if (!def) return;
    // Ensure at least one row per field for editing convenience
    if (entries.length === 0 && def.config.fields.length > 0) {
      setEntries(def.config.fields.map((f) => ({
        id: crypto.randomUUID(),
        field_id: f.id,
        value: "",
        location: "",
        checked: false,
      })));
    }
  }, [def?.id]);

  const previewText = def ? formatCustomActivityForRDO(def, { ...(report ?? {} as any), entries }) : "";

  const handleSave = async () => {
    if (!editable) {
      toast.error("Preenchimento bloqueado");
      return;
    }
    try {
      // Filter empty rows
      const clean = entries.filter((e) => {
        if (!e.field_id) return false;
        const field = def?.config.fields.find((f) => f.id === e.field_id);
        if (!field) return false;
        if (field.mode === "check") return !!e.checked;
        return (e.value || "").toString().trim().length > 0;
      });
      await save.mutateAsync({ entries: clean });
      setEntries(clean);
      toast.success("Atividade salva");
    } catch (e: any) {
      toast.error("Erro ao salvar: " + (e?.message || ""));
    }
  };

  const handleToggleLock = async () => {
    if (!canManage) return;
    try {
      await setLocked.mutateAsync(!locked);
      toast.success(!locked ? "Bloqueado" : "Desbloqueado");
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || ""));
    }
  };

  const handleWhatsApp = async () => {
    const ok = await copyAndShareWhatsApp(previewText);
    if (ok) toast.success("Enviado para WhatsApp!");
    else toast.error("Erro ao compartilhar");
  };

  const handleCopy = async () => {
    const ok = await copyToClipboard(previewText);
    if (ok) toast.success("Copiado!");
    else toast.error("Erro ao copiar");
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 text-center text-muted-foreground">Carregando...</div>
      </Layout>
    );
  }

  if (!def) {
    return (
      <Layout>
        <div className="p-8 text-center space-y-3">
          <p className="text-muted-foreground">Atividade não encontrada.</p>
          <Link to="/relatorio-diario-obra">
            <Button variant="outline"><ArrowLeft className="h-4 w-4 mr-2" />Voltar</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-4 md:p-8 space-y-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div
            className="p-2 rounded-xl text-[#1a1a1a]"
            style={{ background: `linear-gradient(135deg, ${color.from}, ${color.to})` }}
          >
            <Icon className="h-7 w-7" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: color.ring }}>
              {def.title}
            </h1>
            <p className="text-xs text-muted-foreground">
              {format(date, "dd/MM/yy (EEEE)", { locale: ptBR })}
            </p>
          </div>
          {canManage && (
            <Button variant="outline" size="sm" onClick={() => setEditorOpen(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar estrutura
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(date, "dd/MM/yyyy")}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} initialFocus />
            </PopoverContent>
          </Popover>

          {canManage && (
            <Button variant="outline" size="sm" onClick={handleToggleLock}>
              {locked ? <Unlock className="h-4 w-4 mr-2" /> : <Lock className="h-4 w-4 mr-2" />}
              {locked ? "Desbloquear" : "Bloquear"}
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={handleSave}
            disabled={!editable || save.isPending}
          >
            <Save className="h-4 w-4 mr-2" />
            {save.isPending ? "Salvando..." : "Salvar"}
          </Button>

          <Button variant="outline" size="sm" onClick={handleWhatsApp}>
            <MessageCircle className="h-4 w-4 mr-2" />
            WhatsApp
          </Button>

          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="h-4 w-4 mr-2" />
            Copiar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* LEFT: Form */}
          <div className="rounded-2xl border border-border p-4 md:p-5 bg-card space-y-5">
            <div className="flex items-center gap-2">
              <Icon className="h-5 w-5" style={{ color: color.ring }} />
              <h2 className="text-lg font-semibold">Relatório de Atividades</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Preencha os dados da atividade "{def.title}". Estes dados serão incluídos automaticamente no RDO.
            </p>

            <div className="space-y-5">
              {def.config.fields.map((field) => {
                const rows = grouped.get(field.id) ?? [];
                return (
                  <div key={field.id} className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-sm font-semibold uppercase tracking-wide">
                        {field.name}
                        {field.mode === "input" && field.unit ? (
                          <span className="text-muted-foreground normal-case font-normal ml-1">
                            ({field.unit})
                          </span>
                        ) : null}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => addRow(field)}
                        disabled={!editable}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>

                    {rows.length === 0 && (
                      <button
                        type="button"
                        onClick={() => ensureAtLeastOne(field)}
                        disabled={!editable}
                        className="text-xs text-muted-foreground italic hover:text-foreground"
                      >
                        Clique em + para adicionar
                      </button>
                    )}

                    {rows.map((row) => (
                      <div key={row.id} className="grid grid-cols-12 gap-2 items-center">
                        {field.mode === "input" ? (
                          <Input
                            type="number"
                            inputMode="decimal"
                            step="any"
                            value={row.value ?? ""}
                            onChange={(e) => updateRow(row.id, { value: e.target.value })}
                            placeholder="0"
                            disabled={!editable}
                            className="col-span-4"
                          />
                        ) : (
                          <div className="col-span-4 flex items-center gap-2 h-10 px-3 rounded-md border border-input bg-background">
                            <Checkbox
                              checked={!!row.checked}
                              onCheckedChange={(v) => updateRow(row.id, { checked: !!v })}
                              disabled={!editable}
                            />
                            <Input
                              value={row.label ?? ""}
                              onChange={(e) => updateRow(row.id, { label: e.target.value })}
                              placeholder={row.checked ? "Nome da atividade" : "Não realizado"}
                              disabled={!editable}
                              className="h-8 border-0 shadow-none px-1 focus-visible:ring-0"
                            />
                          </div>
                        )}

                        <div className="col-span-7">
                          {field.locations.length > 0 && !field.allowCustomLocation ? (
                            <Select
                              value={row.location ?? ""}
                              onValueChange={(v) => updateRow(row.id, { location: v })}
                              disabled={!editable}
                            >
                              <SelectTrigger><SelectValue placeholder="Local" /></SelectTrigger>
                              <SelectContent>
                                {field.locations.map((loc) => (
                                  <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : field.locations.length > 0 ? (
                            <div className="flex gap-2">
                              <Select
                                value={field.locations.includes(row.location ?? "") ? row.location : ""}
                                onValueChange={(v) => updateRow(row.id, { location: v })}
                                disabled={!editable}
                              >
                                <SelectTrigger className="w-32"><SelectValue placeholder="Local" /></SelectTrigger>
                                <SelectContent>
                                  {field.locations.map((loc) => (
                                    <SelectItem key={loc} value={loc}>{loc}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <Input
                                value={field.locations.includes(row.location ?? "") ? "" : (row.location ?? "")}
                                onChange={(e) => updateRow(row.id, { location: e.target.value })}
                                placeholder="ou digite..."
                                disabled={!editable}
                                className="flex-1"
                              />
                            </div>
                          ) : (
                            <Input
                              value={row.location ?? ""}
                              onChange={(e) => updateRow(row.id, { location: e.target.value })}
                              placeholder={field.allowCustomLocation ? "Local (manual)" : "Local"}
                              disabled={!editable || !field.allowCustomLocation}
                            />
                          )}
                        </div>

                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="col-span-1"
                          onClick={() => removeRow(row.id)}
                          disabled={!editable}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT: Preview */}
          <div className="rounded-2xl border border-border p-4 md:p-5 bg-card space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" style={{ color: color.ring }} />
              <h2 className="text-lg font-semibold">Resumo para RDO</h2>
            </div>
            <p className="text-xs text-muted-foreground">
              Esta prévia mostra como os dados aparecerão no RDO.
            </p>
            <pre className="text-xs whitespace-pre-wrap font-mono bg-muted/40 rounded-md p-3 max-h-[520px] overflow-auto">
{previewText || "Nenhuma atividade preenchida"}
            </pre>
            <div
              className="rounded-md px-3 py-2 text-xs"
              style={{ background: `${color.ring}22`, color: color.ring }}
            >
              💡 Os dados preenchidos aqui serão automaticamente incluídos na seção "{def.title}" do RDO.
            </div>
          </div>
        </div>
      </div>

      <ActivityBuilderDialog
        open={editorOpen}
        onOpenChange={setEditorOpen}
        initial={def}
        onSubmit={async (data) => {
          await update.mutateAsync({ id: def.id, ...data });
          toast.success("Atividade atualizada");
        }}
      />
    </Layout>
  );
}

export default AtividadeCustom;
