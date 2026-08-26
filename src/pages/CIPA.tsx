import { useState, useMemo, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  FileText, Plus, Trash2, Pencil, Download, Eye, Search, Users, Crown,
  ShieldAlert, Filter, Paperclip, Phone, Mail, Briefcase, Calendar,
} from "lucide-react";
import { format } from "date-fns";
import cipaLogo from "@/assets/cipa-logo.png.asset.json";
import { useRHEfetivo } from "@/hooks/useRHEfetivo";
import { compressImage } from "@/utils/imageCompression";


// Colaborador picker (searchable) reused em Presidente/Responsáveis
function ColaboradorPicker({
  value,
  onSelect,
}: {
  value: string;
  onSelect: (nome: string, funcao: string) => void;
}) {
  const { data } = useRHEfetivo();
  const [q, setQ] = useState("");
  const colabs = data?.colaboradores ?? [];
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    const list = s
      ? colabs.filter((c) => `${c.nome} ${c.funcao}`.toLowerCase().includes(s))
      : colabs;
    return list.slice(0, 200);
  }, [colabs, q]);
  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar colaborador do efetivo..."
          className="pl-9"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="max-h-56 overflow-y-auto rounded border border-border divide-y divide-border/60">
        {filtered.length === 0 && (
          <p className="p-3 text-xs text-muted-foreground text-center">Nenhum colaborador</p>
        )}
        {filtered.map((c) => {
          const selected = c.nome === value;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onSelect(c.nome, c.funcao)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-accent/40 transition-colors ${
                selected ? "bg-primary/15" : ""
              }`}
            >
              <div className="font-medium truncate">{c.nome}</div>
              <div className="text-xs text-muted-foreground truncate">{c.funcao}</div>
            </button>
          );
        })}
      </div>
      {value && (
        <p className="text-xs text-muted-foreground">
          Selecionado: <span className="font-medium text-foreground">{value}</span>
        </p>
      )}
    </div>
  );
}

// ---------- Helpers ----------
const uploadFile = async (file: File, folder: string) => {
  const ext = file.name.split(".").pop();
  const path = `cipa/${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("document-files").upload(path, await compressImage(file), { upsert: false });
  if (error) throw error;
  const { data } = supabase.storage.from("document-files").getPublicUrl(path);
  return { url: data.publicUrl, name: file.name };
};

// ============ ATAS ============
type Ata = {
  id: string; title: string; meeting_date: string; responsavel: string | null;
  participantes: string | null; assuntos: string | null; pendencias: string | null;
  observacoes: string | null; file_url: string | null; file_name: string | null;
};

function AtasTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Ata | null>(null);
  const emptyForm = { title: "", meeting_date: format(new Date(), "yyyy-MM-dd"), responsavel: "", participantes: "", assuntos: "", pendencias: "", observacoes: "" };
  const [form, setForm] = useState(emptyForm);
  const [file, setFile] = useState<File | null>(null);

  const { data: atas = [] } = useQuery({
    queryKey: ["cipa-atas"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cipa_atas" as any).select("*").order("meeting_date", { ascending: false });
      if (error) throw error;
      return data as unknown as Ata[];
    },
  });

  const filtered = useMemo(() => atas.filter((a) => {
    const s = search.trim().toLowerCase();
    if (s && !`${a.title} ${a.responsavel || ""} ${a.assuntos || ""}`.toLowerCase().includes(s)) return false;
    if (dateFrom && a.meeting_date < dateFrom) return false;
    if (dateTo && a.meeting_date > dateTo) return false;
    return true;
  }), [atas, search, dateFrom, dateTo]);

  const save = useMutation({
    mutationFn: async () => {
      let file_url = editing?.file_url ?? null;
      let file_name = editing?.file_name ?? null;
      if (file) {
        const up = await uploadFile(file, "atas");
        file_url = up.url; file_name = up.name;
      }
      const payload = { ...form, file_url, file_name };
      if (editing) {
        const { error } = await supabase.from("cipa_atas" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cipa_atas" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(editing ? "Ata atualizada" : "Ata cadastrada");
      qc.invalidateQueries({ queryKey: ["cipa-atas"] });
      setOpen(false); setEditing(null); setForm(emptyForm); setFile(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cipa_atas" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Ata excluída"); qc.invalidateQueries({ queryKey: ["cipa-atas"] }); },
  });

  const openEdit = (a: Ata) => {
    setEditing(a);
    setForm({
      title: a.title, meeting_date: a.meeting_date, responsavel: a.responsavel || "",
      participantes: a.participantes || "", assuntos: a.assuntos || "",
      pendencias: a.pendencias || "", observacoes: a.observacoes || "",
    });
    setFile(null); setOpen(true);
  };

  // Anexo rápido: envia o arquivo e cria a ata automaticamente
  const quickRef = useRef<HTMLInputElement>(null);
  const quickImport = useMutation({
    mutationFn: async (f: File) => {
      const up = await uploadFile(f, "atas");
      const title = f.name.replace(/\.[^.]+$/, "");
      const { error } = await supabase.from("cipa_atas" as any).insert({
        title,
        meeting_date: format(new Date(), "yyyy-MM-dd"),
        file_url: up.url,
        file_name: up.name,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Arquivo anexado à ata");
      qc.invalidateQueries({ queryKey: ["cipa-atas"] });
    },
    onError: (e: any) => toast.error(e.message || "Falha ao anexar"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-end">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar por título, responsável ou assunto..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          <div>
            <Label className="text-xs">De</Label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div>
            <Label className="text-xs">Até</Label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </div>
        <input
          ref={quickRef}
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) quickImport.mutate(f);
            if (quickRef.current) quickRef.current.value = "";
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          onClick={() => quickRef.current?.click()}
          disabled={quickImport.isPending}
          title="Anexar arquivo e criar ata automaticamente"
        >
          <Paperclip className="h-4 w-4" />
          {quickImport.isPending ? "Enviando..." : "Anexar Arquivo"}
        </Button>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(emptyForm); setFile(null); } }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Ata</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar Ata" : "Nova Ata de Reunião"}</DialogTitle></DialogHeader>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="md:col-span-2"><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div><Label>Data da Reunião</Label><Input type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} /></div>
              <div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Participantes</Label><Textarea rows={2} value={form.participantes} onChange={(e) => setForm({ ...form, participantes: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Assuntos Tratados</Label><Textarea rows={3} value={form.assuntos} onChange={(e) => setForm({ ...form, assuntos: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Pendências</Label><Textarea rows={2} value={form.pendencias} onChange={(e) => setForm({ ...form, pendencias: e.target.value })} /></div>
              <div className="md:col-span-2"><Label>Observações</Label><Textarea rows={2} value={form.observacoes} onChange={(e) => setForm({ ...form, observacoes: e.target.value })} /></div>
              <div className="md:col-span-2">
                <Label>Anexo (PDF, Word, Excel, imagem)</Label>
                <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {editing?.file_url && !file && <p className="text-xs text-muted-foreground mt-1">Arquivo atual: {editing.file_name}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!form.title || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhuma ata encontrada.</p>}
        {filtered.map((a) => (
          <Card key={a.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <FileText className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold truncate">{a.title}</h4>
                  <Badge variant="secondary">{format(new Date(a.meeting_date + "T12:00:00"), "dd/MM/yyyy")}</Badge>
                </div>
                {a.responsavel && <p className="text-sm text-muted-foreground mt-1">Responsável: {a.responsavel}</p>}
                {a.assuntos && <p className="text-sm mt-1 line-clamp-2">{a.assuntos}</p>}
              </div>
              <div className="flex gap-1 flex-wrap">
                {a.file_url && (
                  <>
                    <Button size="sm" variant="outline" asChild><a href={a.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a></Button>
                    <Button size="sm" variant="outline" asChild><a href={a.file_url} download={a.file_name || undefined}><Download className="h-4 w-4" /></a></Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(a)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Excluir esta ata?")) remove.mutate(a.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ PRESIDENTE ============
type Pres = { id: string; nome: string; cargo: string | null; setor: string | null; mandato_inicio: string | null; mandato_fim: string | null; foto_url: string | null };

function PresidenteTab() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const empty = { nome: "", cargo: "", setor: "", mandato_inicio: "", mandato_fim: "" };
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<File | null>(null);

  const { data: pres } = useQuery({
    queryKey: ["cipa-president"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cipa_president" as any).select("*").eq("is_current", true).order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (error) throw error;
      return data as unknown as Pres | null;
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      let foto_url = pres?.foto_url ?? null;
      if (photo) {
        const up = await uploadFile(photo, "president");
        foto_url = up.url;
      }
      // Marca todos como não atuais e insere novo atual
      await supabase.from("cipa_president" as any).update({ is_current: false }).eq("is_current", true);
      const payload = {
        nome: form.nome, cargo: form.cargo || null, setor: form.setor || null,
        mandato_inicio: form.mandato_inicio || null, mandato_fim: form.mandato_fim || null,
        foto_url, is_current: true,
      };
      const { error } = await supabase.from("cipa_president" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Presidente atualizado");
      qc.invalidateQueries({ queryKey: ["cipa-president"] });
      setOpen(false); setForm(empty); setPhoto(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button className="gap-2"><Pencil className="h-4 w-4" /> {pres ? "Atualizar Presidente" : "Definir Presidente"}</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Presidente da CIPA</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Colaborador (do Efetivo)</Label>
                <ColaboradorPicker
                  value={form.nome}
                  onSelect={(nome, funcao) =>
                    setForm({ ...form, nome, cargo: form.cargo || funcao })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
                <div><Label>Setor</Label><Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Início do Mandato</Label><Input type="date" value={form.mandato_inicio} onChange={(e) => setForm({ ...form, mandato_inicio: e.target.value })} /></div>
                <div><Label>Fim do Mandato</Label><Input type="date" value={form.mandato_fim} onChange={(e) => setForm({ ...form, mandato_fim: e.target.value })} /></div>
              </div>
              <div><Label>Foto</Label><Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!form.nome || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {pres ? (
        <Card className="max-w-md mx-auto">
          <CardContent className="p-6 flex flex-col items-center gap-3 text-center">
            <div className="h-32 w-32 rounded-full border-4 border-primary/60 overflow-hidden bg-muted flex items-center justify-center">
              {pres.foto_url ? <img loading="lazy" decoding="async" src={pres.foto_url} alt={pres.nome} className="h-full w-full object-cover" /> : <Crown className="h-16 w-16 text-primary" />}
            </div>
            <Badge className="gap-1"><Crown className="h-3 w-3" /> Presidente da CIPA</Badge>
            <h3 className="text-xl font-bold">{pres.nome}</h3>
            {pres.cargo && <p className="text-muted-foreground">{pres.cargo}</p>}
            {pres.setor && <p className="text-sm">Setor: {pres.setor}</p>}
            {(pres.mandato_inicio || pres.mandato_fim) && (
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {pres.mandato_inicio ? format(new Date(pres.mandato_inicio + "T12:00:00"), "dd/MM/yyyy") : "?"} — {pres.mandato_fim ? format(new Date(pres.mandato_fim + "T12:00:00"), "dd/MM/yyyy") : "?"}
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <p className="text-center text-muted-foreground py-12">Nenhum presidente cadastrado.</p>
      )}
    </div>
  );
}

// ============ RESPONSAVEIS ============
type Resp = { id: string; nome: string; funcao: string | null; cargo: string | null; setor: string | null; telefone: string | null; email: string | null; foto_url: string | null };

function ResponsaveisTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Resp | null>(null);
  const empty = { nome: "", funcao: "", cargo: "", setor: "", telefone: "", email: "" };
  const [form, setForm] = useState(empty);
  const [photo, setPhoto] = useState<File | null>(null);

  const { data: list = [] } = useQuery({
    queryKey: ["cipa-responsaveis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cipa_responsaveis" as any).select("*").order("nome");
      if (error) throw error;
      return data as unknown as Resp[];
    },
  });

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return list;
    return list.filter((r) => `${r.nome} ${r.funcao || ""} ${r.setor || ""} ${r.cargo || ""}`.toLowerCase().includes(s));
  }, [list, search]);

  const save = useMutation({
    mutationFn: async () => {
      let foto_url = editing?.foto_url ?? null;
      if (photo) { const up = await uploadFile(photo, "responsaveis"); foto_url = up.url; }
      const payload = { ...form, foto_url };
      if (editing) {
        const { error } = await supabase.from("cipa_responsaveis" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cipa_responsaveis" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["cipa-responsaveis"] }); setOpen(false); setEditing(null); setForm(empty); setPhoto(null); },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cipa_responsaveis" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["cipa-responsaveis"] }); },
  });

  const openEdit = (r: Resp) => {
    setEditing(r);
    setForm({ nome: r.nome, funcao: r.funcao || "", cargo: r.cargo || "", setor: r.setor || "", telefone: r.telefone || "", email: r.email || "" });
    setPhoto(null); setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar responsável..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); setPhoto(null); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo Responsável</Button></DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>{editing ? "Editar" : "Novo"} Responsável</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Colaborador (do Efetivo)</Label>
                <ColaboradorPicker
                  value={form.nome}
                  onSelect={(nome, funcao) =>
                    setForm({ ...form, nome, funcao: form.funcao || funcao, cargo: form.cargo || funcao })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Função</Label><Input value={form.funcao} onChange={(e) => setForm({ ...form, funcao: e.target.value })} /></div>
                <div><Label>Cargo</Label><Input value={form.cargo} onChange={(e) => setForm({ ...form, cargo: e.target.value })} /></div>
              </div>
              <div><Label>Setor</Label><Input value={form.setor} onChange={(e) => setForm({ ...form, setor: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label>Telefone</Label><Input value={form.telefone} onChange={(e) => setForm({ ...form, telefone: e.target.value })} /></div>
                <div><Label>E-mail</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              </div>
              <div><Label>Foto</Label><Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} /></div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!form.nome || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8 col-span-full">Nenhum responsável cadastrado.</p>}
        {filtered.map((r) => (
          <Card key={r.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex gap-3">
              <div className="h-16 w-16 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0 border-2 border-primary/40">
                {r.foto_url ? <img loading="lazy" decoding="async" src={r.foto_url} alt={r.nome} className="h-full w-full object-cover" /> : <Users className="h-8 w-8 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold truncate">{r.nome}</h4>
                {r.funcao && <Badge variant="secondary" className="mt-1">{r.funcao}</Badge>}
                {r.cargo && <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1"><Briefcase className="h-3 w-3" /> {r.cargo}</p>}
                {r.setor && <p className="text-xs text-muted-foreground">Setor: {r.setor}</p>}
                {r.telefone && <p className="text-xs flex items-center gap-1 mt-1"><Phone className="h-3 w-3" /> {r.telefone}</p>}
                {r.email && <p className="text-xs flex items-center gap-1 truncate"><Mail className="h-3 w-3" /> {r.email}</p>}
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(r)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="destructive" onClick={() => { if (confirm("Excluir?")) remove.mutate(r.id); }}><Trash2 className="h-3 w-3" /></Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ DDS IMPORTANTES ============
type Dds = { id: string; title: string; categoria: string | null; dds_date: string | null; responsavel: string | null; descricao: string | null; file_url: string | null; file_name: string | null };
const CATEGORIAS = ["Segurança", "Saúde", "Meio Ambiente", "Comportamental", "Operacional", "Outros"];

function DDSTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Dds | null>(null);
  const empty = { title: "", categoria: "Segurança", dds_date: format(new Date(), "yyyy-MM-dd"), responsavel: "", descricao: "" };
  const [form, setForm] = useState(empty);
  const [file, setFile] = useState<File | null>(null);

  const { data: list = [] } = useQuery({
    queryKey: ["cipa-dds"],
    queryFn: async () => {
      const { data, error } = await supabase.from("cipa_dds" as any).select("*").order("dds_date", { ascending: false });
      if (error) throw error;
      return data as unknown as Dds[];
    },
  });

  const filtered = useMemo(() => list.filter((d) => {
    const s = search.trim().toLowerCase();
    if (s && !`${d.title} ${d.responsavel || ""} ${d.descricao || ""}`.toLowerCase().includes(s)) return false;
    if (catFilter !== "all" && d.categoria !== catFilter) return false;
    if (dateFrom && (d.dds_date || "") < dateFrom) return false;
    if (dateTo && (d.dds_date || "") > dateTo) return false;
    return true;
  }), [list, search, catFilter, dateFrom, dateTo]);

  const save = useMutation({
    mutationFn: async () => {
      let file_url = editing?.file_url ?? null;
      let file_name = editing?.file_name ?? null;
      if (file) { const up = await uploadFile(file, "dds"); file_url = up.url; file_name = up.name; }
      const payload = { ...form, file_url, file_name };
      if (editing) {
        const { error } = await supabase.from("cipa_dds" as any).update(payload).eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cipa_dds" as any).insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => { toast.success("Salvo"); qc.invalidateQueries({ queryKey: ["cipa-dds"] }); setOpen(false); setEditing(null); setForm(empty); setFile(null); },
    onError: (e: any) => toast.error(e.message || "Erro"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cipa_dds" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Removido"); qc.invalidateQueries({ queryKey: ["cipa-dds"] }); },
  });

  const openEdit = (d: Dds) => {
    setEditing(d);
    setForm({ title: d.title, categoria: d.categoria || "Segurança", dds_date: d.dds_date || format(new Date(), "yyyy-MM-dd"), responsavel: d.responsavel || "", descricao: d.descricao || "" });
    setFile(null); setOpen(true);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-end flex-wrap">
        <div className="flex-1 relative min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Pesquisar DDS..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Categoria</Label>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label className="text-xs">De</Label><Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
        <div><Label className="text-xs">Até</Label><Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
        <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) { setEditing(null); setForm(empty); setFile(null); } }}>
          <DialogTrigger asChild><Button className="gap-2"><Plus className="h-4 w-4" /> Novo DDS</Button></DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>{editing ? "Editar DDS" : "Novo DDS Importante"}</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Título</Label><Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label>Categoria</Label>
                  <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIAS.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label>Data</Label><Input type="date" value={form.dds_date} onChange={(e) => setForm({ ...form, dds_date: e.target.value })} /></div>
                <div><Label>Responsável</Label><Input value={form.responsavel} onChange={(e) => setForm({ ...form, responsavel: e.target.value })} /></div>
              </div>
              <div><Label>Descrição</Label><Textarea rows={4} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} /></div>
              <div>
                <Label>Anexo (opcional)</Label>
                <Input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                {editing?.file_url && !file && <p className="text-xs text-muted-foreground mt-1">Arquivo atual: {editing.file_name}</p>}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button disabled={!form.title || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Salvando..." : "Salvar"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3">
        {filtered.length === 0 && <p className="text-center text-muted-foreground py-8">Nenhum DDS encontrado.</p>}
        {filtered.map((d) => (
          <Card key={d.id} className="hover:border-primary/50 transition-colors">
            <CardContent className="p-4 flex flex-col md:flex-row md:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <ShieldAlert className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold truncate">{d.title}</h4>
                  {d.categoria && <Badge>{d.categoria}</Badge>}
                  {d.dds_date && <Badge variant="secondary">{format(new Date(d.dds_date + "T12:00:00"), "dd/MM/yyyy")}</Badge>}
                </div>
                {d.responsavel && <p className="text-sm text-muted-foreground mt-1">Responsável: {d.responsavel}</p>}
                {d.descricao && <p className="text-sm mt-1 line-clamp-2">{d.descricao}</p>}
              </div>
              <div className="flex gap-1 flex-wrap">
                {d.file_url && (
                  <>
                    <Button size="sm" variant="outline" asChild><a href={d.file_url} target="_blank" rel="noreferrer"><Eye className="h-4 w-4" /></a></Button>
                    <Button size="sm" variant="outline" asChild><a href={d.file_url} download={d.file_name || undefined}><Download className="h-4 w-4" /></a></Button>
                  </>
                )}
                <Button size="sm" variant="outline" onClick={() => openEdit(d)}><Pencil className="h-4 w-4" /></Button>
                <Button size="sm" variant="destructive" onClick={() => { if (confirm("Excluir este DDS?")) remove.mutate(d.id); }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ============ PAGE ============
export default function CIPA() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8">
        <header className="flex flex-col md:flex-row items-center gap-4 mb-6 md:mb-8">
          <img loading="lazy" decoding="async" src={cipaLogo.url} alt="CIPA" className="h-24 w-24 md:h-28 md:w-28 object-contain drop-shadow-[0_4px_16px_rgba(0,180,120,0.4)]" />
          <div className="text-center md:text-left">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-emerald-400 to-teal-300 bg-clip-text text-transparent">
              Gestão da CIPA
            </h1>
            <p className="text-muted-foreground mt-1">Comissão Interna de Prevenção de Acidentes</p>
          </div>
        </header>

        <Tabs defaultValue="atas" className="w-full">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 h-auto">
            <TabsTrigger value="atas" className="gap-2 py-2"><FileText className="h-4 w-4" />Atas de Reuniões</TabsTrigger>
            <TabsTrigger value="presidente" className="gap-2 py-2"><Crown className="h-4 w-4" />Presidente</TabsTrigger>
            <TabsTrigger value="responsaveis" className="gap-2 py-2"><Users className="h-4 w-4" />Responsáveis</TabsTrigger>
            <TabsTrigger value="dds" className="gap-2 py-2"><ShieldAlert className="h-4 w-4" />DDS Importantes</TabsTrigger>
          </TabsList>

          <TabsContent value="atas" className="mt-4"><AtasTab /></TabsContent>
          <TabsContent value="presidente" className="mt-4"><PresidenteTab /></TabsContent>
          <TabsContent value="responsaveis" className="mt-4"><ResponsaveisTab /></TabsContent>
          <TabsContent value="dds" className="mt-4"><DDSTab /></TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
