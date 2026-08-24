import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, FileText, Upload, Trash2, CheckCircle2, Search, Calendar, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  useMeetingMinutes,
  useMeetingMinuteItems,
  useToggleMinuteItem,
  useDeleteMeetingMinute,
  type MeetingMinuteItem,
} from "@/hooks/useMeetingMinutes";
import { parseAtaPdf } from "@/lib/parseAtaPdf";
import { cn } from "@/lib/utils";

export default function AtaReuniaoContrato() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const { data: minutes = [], isLoading: loadingMinutes } = useMeetingMinutes();
  const currentId = selectedId ?? minutes[0]?.id ?? null;
  const { data: items = [], isLoading: loadingItems } = useMeetingMinuteItems(currentId);
  const toggle = useToggleMinuteItem();
  const remove = useDeleteMeetingMinute();

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.item_number.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        (i.section ?? "").toLowerCase().includes(q),
    );
  }, [items, search]);

  const grouped = useMemo(() => {
    const map = new Map<string, MeetingMinuteItem[]>();
    for (const it of filteredItems) {
      const key = it.section ?? "Outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(it);
    }
    return Array.from(map.entries());
  }, [filteredItems]);

  const stats = useMemo(() => {
    const total = items.length;
    const done = items.filter((i) => i.completed).length;
    const pct = total ? (done / total) * 100 : 0;
    return { total, done, pending: total - done, pct };
  }, [items]);

  async function handleImport(file: File) {
    setImporting(true);
    try {
      const parsed = await parseAtaPdf(file);
      if (parsed.items.length === 0) {
        toast.error("Nenhum item encontrado no PDF. Verifique o formato.");
        return;
      }

      // Upload PDF to storage (security-files bucket)
      const path = `atas/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage
        .from("security-files")
        .upload(path, file, { upsert: false, contentType: "application/pdf" });
      let fileUrl: string | null = null;
      if (!upErr) {
        const { data } = supabase.storage.from("security-files").getPublicUrl(path);
        fileUrl = data.publicUrl;
      }

      const { data: u } = await supabase.auth.getUser();
      const { data: minute, error: mErr } = await supabase
        .from("meeting_minutes")
        .insert({
          title: file.name.replace(/\.pdf$/i, ""),
          meeting_date: parsed.meetingDate,
          file_url: fileUrl,
          raw_text: parsed.rawText,
          created_by: u.user?.id ?? null,
        })
        .select()
        .single();
      if (mErr) throw mErr;

      // dedupe_key: número + primeiros 80 chars normalizados da descrição
      const makeKey = (item_number: string, description: string) => {
        const norm = (description || "")
          .toLowerCase()
          .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9 ]+/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 80);
        return `${item_number}|${norm}`;
      };

      // Carrega itens já concluídos de TODAS as atas anteriores para reaproveitar status
      const { data: prevDone } = await supabase
        .from("meeting_minute_items")
        .select("dedupe_key, completed_at, completed_by")
        .eq("completed", true)
        .not("dedupe_key", "is", null);
      const doneMap = new Map<string, { completed_at: string | null; completed_by: string | null }>();
      for (const r of prevDone ?? []) {
        if (r.dedupe_key && !doneMap.has(r.dedupe_key)) {
          doneMap.set(r.dedupe_key, { completed_at: r.completed_at, completed_by: r.completed_by });
        }
      }

      const rows = parsed.items.map((i) => {
        const key = makeKey(i.item_number, i.description);
        const prior = doneMap.get(key);
        return {
          minute_id: minute.id,
          item_number: i.item_number,
          section: i.section,
          description: i.description,
          action_by: i.action_by,
          deadline: i.deadline,
          original_status: i.original_status,
          sort_order: i.sort_order,
          dedupe_key: key,
          completed: !!prior,
          completed_at: prior?.completed_at ?? null,
          completed_by: prior?.completed_by ?? null,
        };
      });
      const { error: iErr } = await supabase.from("meeting_minute_items").insert(rows);
      if (iErr) throw iErr;

      const carriedOver = rows.filter((r) => r.completed).length;

      setSelectedId(minute.id);
      toast.success(
        `Ata importada: ${parsed.items.length} itens` +
        (carriedOver > 0 ? ` (${carriedOver} já marcados como concluídos)` : "")
      );

      // Notifica grupo WhatsApp sobre a nova ata importada
      supabase.functions
        .invoke("wapi-ata-contrato-notify", {
          body: { minute_id: minute.id, reason: "imported" },
        })
        .catch((e) => console.warn("[ata-notify import]", e));
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao importar PDF: " + (e?.message ?? "erro desconhecido"));
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSendToGroup() {
    if (!currentId) {
      toast.error("Selecione uma ata primeiro");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("wapi-ata-contrato-notify", {
        body: { minute_id: currentId, reason: "imported", force: true },
      });
      if (error) throw error;
      if ((data as any)?.skipped) {
        toast.warning(`Não enviado: ${(data as any).reason}`);
      } else {
        toast.success("Resumo enviado ao grupo do WhatsApp!");
      }
    } catch (e: any) {
      console.error(e);
      toast.error("Falha ao enviar: " + (e?.message ?? "erro"));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <Button asChild variant="ghost" size="icon">
          <Link to="/planejamento"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div className="p-2 rounded-lg bg-primary/10">
          <FileText className="w-6 h-6 text-primary" />
        </div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-xl sm:text-3xl font-bold text-gradient">Ata Reunião de Contrato</h1>
          <p className="text-sm text-muted-foreground">
            Importe a ata em PDF e marque itens conforme forem concluídos.
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleImport(f);
          }}
        />
        <Button onClick={() => fileRef.current?.click()} disabled={importing}>
          {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
          {importing ? "Importando..." : "Importar PDF da Ata"}
        </Button>
        <Button
          onClick={handleSendToGroup}
          disabled={sending || !currentId}
          variant="secondary"
        >
          {sending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
          {sending ? "Enviando..." : "Salvar e Enviar ao Grupo"}
        </Button>
      </div>

      {/* Selector + summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardDescription>Ata selecionada</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {minutes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma ata importada ainda.</p>
            ) : (
              <>
                <Select value={currentId ?? ""} onValueChange={setSelectedId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma ata" />
                  </SelectTrigger>
                  <SelectContent>
                    {minutes.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.meeting_date ? `[${m.meeting_date}] ` : ""}
                        {m.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {currentId && (
                  <div className="flex items-center justify-between gap-2">
                    {minutes.find((m) => m.id === currentId)?.file_url && (
                      <Button asChild variant="outline" size="sm">
                        <a href={minutes.find((m) => m.id === currentId)!.file_url!} target="_blank" rel="noreferrer">
                          Abrir PDF original
                        </a>
                      </Button>
                    )}
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-1" /> Excluir
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir esta ata?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todos os itens marcados serão removidos. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={async () => {
                              await remove.mutateAsync(currentId);
                              setSelectedId(null);
                              toast.success("Ata excluída");
                            }}
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardDescription>Progresso</CardDescription>
            <CardTitle className="text-3xl tabular-nums">
              {stats.done}<span className="text-base font-normal text-muted-foreground"> / {stats.total} concluídos</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Progress value={stats.pct} className="h-2" />
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 mr-1" /> {stats.done} concluídos
              </Badge>
              <Badge variant="outline">{stats.pending} pendentes</Badge>
              <Badge variant="secondary">{stats.pct.toFixed(1)}%</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      {currentId && (
        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar item, descrição ou seção..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {/* Items grouped */}
      {loadingMinutes || loadingItems ? (
        <div className="text-center py-10 text-muted-foreground">Carregando...</div>
      ) : !currentId ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Importe um PDF de Ata de Reunião para começar.</p>
          </CardContent>
        </Card>
      ) : grouped.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Nenhum item corresponde à busca.
          </CardContent>
        </Card>
      ) : (
        <div className="h-[calc(100vh-26rem)] min-h-[400px] overflow-y-auto pr-2 space-y-4 rounded-lg scroll-smooth">
          {grouped.map(([section, sItems]) => (
            <Card key={section}>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">{section}</CardTitle>
                <CardDescription>
                  {sItems.filter((i) => i.completed).length} / {sItems.length} concluídos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {sItems.map((it) => (
                  <div
                    key={it.id}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                      it.completed ? "bg-emerald-500/5 border-emerald-300/40" : "bg-card hover:bg-accent/30",
                    )}
                  >
                    <Checkbox
                      checked={it.completed}
                      onCheckedChange={(v) =>
                        toggle.mutate({ id: it.id, completed: !!v })
                      }
                      className="mt-1"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge variant="outline" className="font-mono text-xs">
                          {it.item_number}
                        </Badge>
                        {it.original_status && (
                          <Badge variant="secondary" className="text-xs">
                            {it.original_status}
                          </Badge>
                        )}
                        {it.deadline && (
                          <Badge variant="outline" className="text-xs gap-1">
                            <Calendar className="w-3 h-3" />
                            {it.deadline}
                          </Badge>
                        )}
                        {it.completed && (
                          <Badge className="bg-emerald-500/10 text-emerald-700 border border-emerald-300 text-xs">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Concluído
                          </Badge>
                        )}
                      </div>
                      <p className={cn("text-sm leading-relaxed", it.completed && "line-through text-muted-foreground")}>
                        {it.description}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
