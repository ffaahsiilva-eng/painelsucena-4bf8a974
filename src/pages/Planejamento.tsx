import { useEffect, useMemo, useRef, useState } from "react";
import { Target, TrendingUp, CheckCircle2, AlertCircle, Pencil, Save, X, RefreshCw, FileText, Upload } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlanejamentoMetas, useUpdatePlanejamentoMeta, type PlanejamentoMeta } from "@/hooks/usePlanejamentoMetas";
import { useIsAdmin } from "@/hooks/useUserRole";
import { useProfile } from "@/hooks/useProfile";
import { cn } from "@/lib/utils";
import ExcelJS from "exceljs";

function pct(realizado: number, meta: number) {
  if (!meta || meta <= 0) return 0;
  return Math.min(100, (realizado / meta) * 100);
}

function progressTone(p: number) {
  if (p >= 100) return "text-emerald-600";
  if (p >= 50) return "text-amber-600";
  if (p > 0) return "text-orange-600";
  return "text-muted-foreground";
}

function MetaRow({ meta, canEdit }: { meta: PlanejamentoMeta; canEdit: boolean }) {
  const [editing, setEditing] = useState(false);
  const [metaVal, setMetaVal] = useState(String(meta.meta));
  const [realVal, setRealVal] = useState(String(meta.realizado));
  const update = useUpdatePlanejamentoMeta();

  const p = pct(meta.realizado, meta.meta);
  const tone = progressTone(p);
  const completed = p >= 100 && meta.meta > 0;

  const save = () => {
    update.mutate(
      { id: meta.id, meta: Number(metaVal) || 0, realizado: Number(realVal) || 0 },
      { onSuccess: () => setEditing(false) }
    );
  };

  return (
    <div className="rounded-lg border bg-card p-4 hover:bg-accent/30 transition-colors cv-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {meta.linha !== null && (
              <Badge variant="outline" className="font-mono text-xs">
                {meta.linha}
              </Badge>
            )}
            {completed ? (
              <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-300 hover:bg-emerald-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Concluída
              </Badge>
            ) : meta.meta > 0 ? (
              <Badge variant="secondary" className="text-xs">
                <AlertCircle className="w-3 h-3 mr-1" /> Em andamento
              </Badge>
            ) : null}
            {meta.unidade && (
              <span className="text-xs text-muted-foreground">{meta.unidade}</span>
            )}
          </div>
          <p className="mt-2 text-sm font-medium leading-snug">{meta.atividade}</p>
        </div>
        {canEdit && !editing && (
          <Button variant="ghost" size="icon" onClick={() => setEditing(true)} className="h-8 w-8 shrink-0">
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>

      {editing ? (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 items-end">
          <div>
            <label className="text-xs text-muted-foreground">Meta</label>
            <Input type="number" value={metaVal} onChange={(e) => setMetaVal(e.target.value)} className="h-8" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Realizado</label>
            <Input type="number" value={realVal} onChange={(e) => setRealVal(e.target.value)} className="h-8" />
          </div>
          <div className="flex gap-1 col-span-2 sm:col-span-1">
            <Button size="sm" onClick={save} disabled={update.isPending} className="flex-1">
              <Save className="w-3.5 h-3.5 mr-1" /> Salvar
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{meta.realizado.toLocaleString("pt-BR")}</span>
              {" / "}
              <span>{meta.meta.toLocaleString("pt-BR")}</span>
              {meta.unidade ? ` ${meta.unidade}` : ""}
            </span>
            <span className={cn("font-bold tabular-nums", tone)}>{p.toFixed(2)}%</span>
          </div>
          <Progress value={p} className="h-2" />
        </div>
      )}
    </div>
  );
}

export default function Planejamento() {
  const { data: metas = [], isLoading } = usePlanejamentoMetas();
  const { isAdmin } = useIsAdmin();
  const { data: profile } = useProfile();
  const canEdit = isAdmin || profile?.cargo === "planejador" || profile?.cargo === "engenheiro_planejamento";
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const loadingToast = toast.loading("Processando planilha e atualizando metas...");

    try {
      const workbook = new ExcelJS.Workbook();
      const arrayBuffer = await file.arrayBuffer();
      await workbook.xlsx.load(arrayBuffer);
      
      const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
      if (!worksheet) throw new Error("Não foi possível encontrar uma aba na planilha.");

      // Carrega todas as metas existentes para casar por atividade (nome) ou linha
      const { data: existing, error: existingErr } = await supabase
        .from("planejamento_metas")
        .select("id, linha, atividade, is_section_header, categoria");
      if (existingErr) throw existingErr;

      const COL_LINHA = 1; // A
      const COL_ATIV = 2;  // B
      const COL_META = 3;  // C
      const COL_REAL = 4;  // D
      const COL_UNID = 5;  // E

      const num = (v: any) => {
        if (v === null || v === undefined || v === "") return 0;
        if (typeof v === 'object' && 'result' in v) return Number((v as any).result) || 0;
        const n = Number(v);
        return isNaN(n) ? 0 : n;
      };
      const str = (v: any) => {
        if (v === null || v === undefined) return "";
        if (typeof v === 'object' && 'result' in v) return String((v as any).result ?? "").trim();
        if (typeof v === 'object' && 'richText' in v) return ((v as any).richText || []).map((r: any) => r.text).join("").trim();
        return String(v).trim();
      };
      const norm = (s: string) => s.toLowerCase().replace(/\s+/g, " ").trim();

      const records: any[] = [];
      let displayOrder = 0;
      let currentCategoria: string | null = null;
      const usedIds = new Set<string>();

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return; // cabeçalho

        const linhaRaw = row.getCell(COL_LINHA).value;
        const atividade = str(row.getCell(COL_ATIV).value);
        if (!atividade) return; // linha vazia

        const linhaStr = str(linhaRaw);
        const linhaNum = linhaStr ? Number(linhaStr) : NaN;
        const isHeader = !linhaStr || isNaN(linhaNum);

        displayOrder++;

        if (isHeader) {
          currentCategoria = atividade;
          const match = existing?.find(e => e.is_section_header && norm(e.atividade) === norm(atividade) && !usedIds.has(e.id));
          if (match) usedIds.add(match.id);
          records.push({
            ...(match?.id ? { id: match.id } : {}),
            linha: null,
            categoria: atividade,
            atividade,
            meta: 0,
            realizado: 0,
            unidade: null,
            display_order: displayOrder,
            is_section_header: true,
          });
        } else {
          // Casar pelo nome da atividade (dentro da categoria) — assim renumerar a coluna LINHA atualiza
          let match = existing?.find(e => !e.is_section_header && !usedIds.has(e.id)
            && norm(e.atividade) === norm(atividade)
            && (currentCategoria ? norm(e.categoria || "") === norm(currentCategoria) : true));
          if (!match) {
            match = existing?.find(e => !e.is_section_header && !usedIds.has(e.id) && norm(e.atividade) === norm(atividade));
          }
          if (!match) {
            match = existing?.find(e => !e.is_section_header && !usedIds.has(e.id) && e.linha === linhaNum);
          }
          if (match) usedIds.add(match.id);
          records.push({
            ...(match?.id ? { id: match.id } : {}),
            linha: linhaNum,
            categoria: currentCategoria,
            atividade,
            meta: num(row.getCell(COL_META).value),
            realizado: num(row.getCell(COL_REAL).value),
            unidade: str(row.getCell(COL_UNID).value) || null,
            display_order: displayOrder,
            is_section_header: false,
          });
        }
      });

      if (records.length === 0) {
        throw new Error("Nenhuma linha encontrada na planilha.");
      }

      const toUpdate = records.filter(r => r.id);
      const toInsert = records.filter(r => !r.id).map(({ id: _id, ...rest }) => rest);

      if (toUpdate.length) {
        const { error: upErr } = await supabase.from("planejamento_metas").upsert(toUpdate);
        if (upErr) throw upErr;
      }
      if (toInsert.length) {
        const { error: insErr } = await supabase.from("planejamento_metas").insert(toInsert);
        if (insErr) throw insErr;
      }
      const updates = records;

      // Enviar notificação para o WhatsApp (Resumo Mensal)
      const { error: notifyError } = await supabase.functions.invoke("wapi-planning-notify", {
        body: { 
          eventType: "spreadsheet_uploaded", 
          force: true,
          userName: profile?.full_name || "Usuário"
        },
      });

      if (notifyError) console.warn("Falha ao enviar notificação WhatsApp:", notifyError);

      toast.success(`${updates.length} metas atualizadas e resumo enviado ao grupo!`, { id: loadingToast });
      qc.invalidateQueries({ queryKey: ["planejamento-metas"] });
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error(error.message || "Erro ao processar planilha", { id: loadingToast });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };


  const grouped = useMemo(() => {
    const groups: { categoria: string; items: PlanejamentoMeta[] }[] = [];
    let current: { categoria: string; items: PlanejamentoMeta[] } | null = null;
    for (const m of metas) {
      if (m.is_section_header) {
        current = { categoria: m.atividade, items: [] };
        groups.push(current);
      } else if (current) {
        current.items.push(m);
      }
    }
    return groups;
  }, [metas]);

  const summary = useMemo(() => {
    const items = metas.filter((m) => !m.is_section_header && m.meta > 0);
    const total = items.length;
    const completed = items.filter((m) => m.realizado >= m.meta).length;
    const totalMeta = items.reduce((s, m) => s + m.meta, 0);
    const totalReal = items.reduce((s, m) => s + Math.min(m.realizado, m.meta), 0);
    const overall = totalMeta > 0 ? (totalReal / totalMeta) * 100 : 0;
    return { total, completed, overall };
  }, [metas]);

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Target className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl sm:text-3xl font-bold text-gradient">Planejamento</h1>
          <p className="text-sm text-muted-foreground">
            Avanço Mensal — Meta DRS. Cada linha representa uma meta a bater.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canEdit && (
            <>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls"
                className="hidden"
              />
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="rounded-full px-6"
              >
                {uploading ? <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                {uploading ? "Enviando..." : "Enviar Planilha"}
              </Button>
            </>
          )}
          <Button asChild variant="outline" size="sm" className="rounded-full px-6">
            <Link to="/ata-reuniao-contrato">
              <FileText className="w-4 h-4 mr-2" />
              Ata Reunião de Contrato
            </Link>
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Avanço geral
            </CardDescription>
            <CardTitle className="text-3xl tabular-nums">{summary.overall.toFixed(2)}%</CardTitle>
          </CardHeader>
          <CardContent>
            <Progress value={summary.overall} className="h-2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Metas concluídas</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {summary.completed}
              <span className="text-base font-normal text-muted-foreground"> / {summary.total}</span>
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total de atividades</CardDescription>
            <CardTitle className="text-3xl tabular-nums">{metas.filter((m) => !m.is_section_header).length}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Sections */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : (
        <div className="h-[calc(100vh-22rem)] overflow-y-auto pr-2 space-y-6 rounded-lg cv-auto">
          {grouped.map((group) => (
            <Card key={group.categoria}>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">{group.categoria}</CardTitle>
                <CardDescription>
                  {group.items.length} {group.items.length === 1 ? "meta" : "metas"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {group.items.map((m) => (
                  <MetaRow key={m.id} meta={m} canEdit={canEdit} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
