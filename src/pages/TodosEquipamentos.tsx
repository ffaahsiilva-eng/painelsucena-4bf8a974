import { useMemo, useState } from "react";
import Layout from "@/components/layout/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Plus, Trash2, Truck, Search, Sprout, Upload, ImageIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  useEquipment,
  useCreateEquipment,
  useUpdateEquipment,
  useDeleteEquipment,
  MOBILIZATION_STATUS_LABELS,
  type Equipment,
  type MobilizationStatus,
} from "@/hooks/useEquipment";
import {
  useJardinagemEquipment,
  useCreateJardinagemEquipment,
  useUpdateJardinagemEquipment,
  useDeleteJardinagemEquipment,
} from "@/hooks/useJardinagemEquipment";
import {
  VehicleIcon,
  equipmentTypeLabels,
  type EquipmentType,
} from "@/components/equipamentos/VehicleIcons";
import { toast } from "@/hooks/use-toast";
import { useDebounce } from "@/hooks/useDebounce";
import { compressImage } from "@/utils/imageCompression";


const EQUIPMENT_TYPES: EquipmentType[] = ["pipa", "munk", "camionete", "onibus"];
const MOBILIZATION_STATUSES: MobilizationStatus[] = ["mobilizando", "mobilizado", "desmobilizando", "desmobilizado"];

const MOBILIZATION_BADGE_CLASS: Record<MobilizationStatus, string> = {
  mobilizando: "bg-blue-500/15 text-blue-600 border-blue-500/30",
  mobilizado: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
  desmobilizando: "bg-amber-500/15 text-amber-600 border-amber-500/30",
  desmobilizado: "bg-rose-500/15 text-rose-600 border-rose-500/30",
};

interface FormState {
  name: string;
  plate: string;
  equipment_type: EquipmentType;
  driver: string;
  helper: string;
  start_hour: number;
  end_hour: number;
  image_url: string | null;
  mobilization_status: MobilizationStatus;
}

const emptyForm: FormState = {
  name: "",
  plate: "",
  equipment_type: "camionete",
  driver: "",
  helper: "",
  start_hour: 7,
  end_hour: 17,
  image_url: null,
  mobilization_status: "mobilizado",
};

const JardinagemImage = ({ url, name }: { url: string | null | undefined; name: string }) => {
  const [error, setError] = useState(false);
  const isValid = !error && typeof url === 'string' && (url.startsWith('http') || url.startsWith('data:'));

  if (isValid) {
    return (
      <img
        loading="lazy"
        decoding="async"
        src={url as string}
        alt={name}
        className="h-20 w-20 object-contain"
        onError={() => setError(true)}
      />
    );
  }

  return (
    <div className="h-12 w-12 rounded border flex items-center justify-center bg-muted/40 text-emerald-500/40">
      <Sprout className="h-6 w-6" />
    </div>
  );
};

export default function TodosEquipamentos() {
  const { data: equipment = [], isLoading } = useEquipment({ includeDesmobilized: true });
  const createMut = useCreateEquipment();
  const updateMut = useUpdateEquipment();
  const deleteMut = useDeleteEquipment();

  const { data: jardinagem = [], isLoading: loadingJardinagem } = useJardinagemEquipment();
  const createJardinagem = useCreateJardinagemEquipment();
  const updateJardinagem = useUpdateJardinagemEquipment();
  const deleteJardinagem = useDeleteJardinagemEquipment();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Equipment | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Equipment | null>(null);
  const [jardinagemOpen, setJardinagemOpen] = useState(false);
  const [jardinagemName, setJardinagemName] = useState("");
  const [jardinagemImageUrl, setJardinagemImageUrl] = useState<string | null>(null);
  const [editingJardinagem, setEditingJardinagem] = useState<{ id: string; name: string } | null>(null);
  const [deleteJardinagemTarget, setDeleteJardinagemTarget] = useState<{ id: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);

  const debouncedSearch = useDebounce(search, 300);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() || "jpg";
      const path = `equipment/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error } = await supabase.storage.from("site-assets").upload(path, await compressImage(file), {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type || "image/jpeg",
      });
      if (error) throw error;
      const { data } = supabase.storage.from("site-assets").getPublicUrl(path);
      return data.publicUrl;
    } catch (err: any) {
      toast({ title: "Erro ao enviar imagem", description: err.message, variant: "destructive" });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return equipment;
    return equipment.filter((e) =>
      e.name.toLowerCase().includes(q) ||
      e.plate.toLowerCase().includes(q) ||
      (e.driver || "").toLowerCase().includes(q)
    );
  }, [equipment, debouncedSearch]);

  const filteredJardinagem = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    if (!q) return jardinagem;
    return jardinagem.filter((e) =>
      e.name.toLowerCase().includes(q)
    );
  }, [jardinagem, debouncedSearch]);

  // Default image per equipment_type = most frequent image_url already used by that type
  const defaultImagesByType = useMemo(() => {
    const counts: Record<string, Record<string, number>> = {};
    for (const eq of equipment) {
      if (!eq.image_url) continue;
      const type = eq.equipment_type as string;
      counts[type] = counts[type] || {};
      counts[type][eq.image_url] = (counts[type][eq.image_url] || 0) + 1;
    }
    const out: Record<string, string> = {};
    for (const [type, urls] of Object.entries(counts)) {
      let best: string | null = null;
      let bestCount = 0;
      for (const [url, c] of Object.entries(urls)) {
        if (c > bestCount) {
          best = url;
          bestCount = c;
        }
      }
      if (best) out[type] = best;
    }
    return out;
  }, [equipment]);

  const openNew = () => {
    setEditing(null);
    setForm({
      ...emptyForm,
      image_url: defaultImagesByType[emptyForm.equipment_type] ?? null,
    });
    setOpen(true);
  };

  const openEdit = (eq: Equipment) => {
    setEditing(eq);
    setForm({
      name: eq.name,
      plate: eq.plate,
      equipment_type: eq.equipment_type,
      driver: eq.driver || "",
      helper: eq.helper || "",
      start_hour: eq.start_hour,
      end_hour: eq.end_hour,
      image_url: eq.image_url ?? null,
      mobilization_status: (eq.mobilization_status ?? "mobilizado") as MobilizationStatus,
    });
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.plate.trim()) {
      toast({ title: "Nome e Placa são obrigatórios", variant: "destructive" });
      return;
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...form });
        toast({ title: "Equipamento atualizado" });
      } else {
        await createMut.mutateAsync(form);
        toast({ title: "Equipamento cadastrado" });
      }
      setOpen(false);
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast({ title: "Equipamento removido" });
      setDeleteTarget(null);
    } catch (err: any) {
      toast({ title: "Erro ao remover", description: err.message, variant: "destructive" });
    }
  };

  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] p-4 md:p-8 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="p-2 rounded-xl bg-gradient-to-br from-[#c9a84c] to-[#f0d78c] text-[#1a1a1a]">
            <Truck className="h-7 w-7" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#c9a84c]">
            Todos os Equipamentos
          </h1>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Adicione pela placa."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mb-3 mt-2">
          <div className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-[#c9a84c]" />
            <h2 className="text-lg font-semibold text-[#c9a84c]">Equipamentos Pesados</h2>
            <span className="text-xs text-muted-foreground">({filtered.length})</span>
          </div>
          <Button onClick={openNew} className="gap-2" size="sm">
            <Plus className="h-4 w-4" /> Cadastrar Novo
          </Button>
        </div>

        <div className="table-scroll rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Placa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="hidden md:table-cell">Motorista</TableHead>
                <TableHead className="hidden md:table-cell">Ajudante</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    Nenhum equipamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>
                      <VehicleIcon
                        type={eq.equipment_type}
                        imageUrl={eq.image_url}
                        className="h-20 w-20"
                        size="lg"
                      />
                    </TableCell>
                    <TableCell className="font-medium">{eq.name}</TableCell>
                    <TableCell>{eq.plate}</TableCell>
                    <TableCell>{equipmentTypeLabels[eq.equipment_type] || eq.equipment_type}</TableCell>
                    <TableCell className="hidden md:table-cell">{eq.driver || "—"}</TableCell>
                    <TableCell className="hidden md:table-cell">{eq.helper || "—"}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${MOBILIZATION_BADGE_CLASS[eq.mobilization_status ?? "mobilizado"]}`}>
                        {MOBILIZATION_STATUS_LABELS[eq.mobilization_status ?? "mobilizado"]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" size="icon" onClick={() => openEdit(eq)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteTarget(eq)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mb-3 mt-8">
          <div className="flex items-center gap-2">
            <Sprout className="h-5 w-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-emerald-500">Jardinagem</h2>
            <span className="text-xs text-muted-foreground">({filteredJardinagem.length})</span>
          </div>
          <Button onClick={() => { setEditingJardinagem(null); setJardinagemName(""); setJardinagemImageUrl(null); setJardinagemOpen(true); }} className="gap-2 bg-emerald-600 hover:bg-emerald-700" size="sm">
            <Plus className="h-4 w-4" /> Cadastrar Novo
          </Button>
        </div>

        <div className="table-scroll rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">Foto</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingJardinagem ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8">Carregando...</TableCell></TableRow>
              ) : filteredJardinagem.length === 0 ? (
                <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum equipamento de jardinagem.</TableCell></TableRow>
              ) : (
                filteredJardinagem.map((eq) => (
                  <TableRow key={eq.id}>
                    <TableCell>
                      <JardinagemImage url={eq.image_url} name={eq.name} />
                    </TableCell>
                    <TableCell className="font-medium">{eq.name}</TableCell>
                    <TableCell>
                      <span className={eq.status === "entrou" ? "text-green-500" : "text-orange-500"}>
                        {eq.status === "entrou" ? "No Canteiro" : "Fora"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => {
                            setEditingJardinagem({ id: eq.id, name: eq.name });
                            setJardinagemName(eq.name);
                            setJardinagemImageUrl(eq.image_url ?? null);
                            setJardinagemOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          onClick={() => setDeleteJardinagemTarget({ id: eq.id, name: eq.name })}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>


        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-lg w-[95vw] sm:w-full">
            <DialogHeader>
              <DialogTitle>
                {editing ? "Editar Equipamento" : "Cadastrar Equipamento"}
              </DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label>Foto do Equipamento</Label>
                <div className="flex items-center gap-3">
                  {form.image_url ? (
                    <img loading="lazy" decoding="async" src={form.image_url} alt="" className="h-20 w-20 object-contain" />
                  ) : (
                    <div className="h-20 w-20 rounded border flex items-center justify-center bg-muted/40">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      id="eq-img"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadImage(file);
                        if (url) setForm({ ...form, image_url: url });
                        e.target.value = "";
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("eq-img")?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando..." : "Enviar imagem"}
                    </Button>
                    {form.image_url && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setForm({ ...form, image_url: null })}>
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Nome *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Placa/ID *</Label>
                  <Input
                    value={form.plate}
                    onChange={(e) => setForm({ ...form, plate: e.target.value.toUpperCase() })}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Tipo</Label>
                  <Select
                    value={form.equipment_type}
                    onValueChange={(v) => {
                      const newType = v as EquipmentType;
                      const prevDefault = defaultImagesByType[form.equipment_type] ?? null;
                      const nextDefault = defaultImagesByType[newType] ?? null;
                      // Auto-swap image when it matches the previous type's default or is empty
                      const shouldSwap = !form.image_url || form.image_url === prevDefault;
                      setForm({
                        ...form,
                        equipment_type: newType,
                        image_url: shouldSwap ? nextDefault : form.image_url,
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {EQUIPMENT_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {equipmentTypeLabels[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Status de Mobilização</Label>
                <Select
                  value={form.mobilization_status}
                  onValueChange={(v) => setForm({ ...form, mobilization_status: v as MobilizationStatus })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MOBILIZATION_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {MOBILIZATION_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Desmobilizado oculta o equipamento dos painéis operacionais, RDO e Parte Diária.
                </p>
              </div>
              <div className="grid gap-1.5">
                <Label>Motorista</Label>
                <Input
                  value={form.driver}
                  onChange={(e) => setForm({ ...form, driver: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Ajudante / Sinaleiro</Label>
                <Input
                  value={form.helper}
                  onChange={(e) => setForm({ ...form, helper: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label>Hora Início</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={form.start_hour}
                    onChange={(e) =>
                      setForm({ ...form, start_hour: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label>Hora Fim</Label>
                  <Input
                    type="number"
                    min={0}
                    max={23}
                    value={form.end_hour}
                    onChange={(e) =>
                      setForm({ ...form, end_hour: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleSave}
                disabled={createMut.isPending || updateMut.isPending}
              >
                {editing ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover equipamento?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja remover{" "}
              <strong>{deleteTarget?.name}</strong> ({deleteTarget?.plate})? Esta
              ação não pode ser desfeita.
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMut.isPending}
              >
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={jardinagemOpen} onOpenChange={setJardinagemOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingJardinagem ? "Editar Equipamento de Jardinagem" : "Cadastrar Equipamento de Jardinagem"}</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-2">
              <div className="grid gap-1.5">
                <Label>Foto do Equipamento</Label>
                <div className="flex items-center gap-3">
                  {jardinagemImageUrl ? (
                    <img loading="lazy" decoding="async" src={jardinagemImageUrl} alt="" className="h-20 w-20 object-contain" />
                  ) : (
                    <div className="h-20 w-20 rounded border flex items-center justify-center bg-muted/40">
                      <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      id="jard-img"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const url = await uploadImage(file);
                        if (url) setJardinagemImageUrl(url);
                        e.target.value = "";
                      }}
                    />
                    <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => document.getElementById("jard-img")?.click()}>
                      <Upload className="h-4 w-4 mr-1" /> {uploading ? "Enviando..." : "Enviar imagem"}
                    </Button>
                    {jardinagemImageUrl && (
                      <Button type="button" variant="ghost" size="sm" onClick={() => setJardinagemImageUrl(null)}>
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label>Nome *</Label>
                <Input
                  value={jardinagemName}
                  onChange={(e) => setJardinagemName(e.target.value)}
                  placeholder="Ex: Roçadeira 01"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setJardinagemOpen(false)}>Cancelar</Button>
              <Button
                onClick={async () => {
                  if (!jardinagemName.trim()) {
                    toast({ title: "Nome é obrigatório", variant: "destructive" });
                    return;
                  }
                  if (editingJardinagem) {
                    await updateJardinagem.mutateAsync({ id: editingJardinagem.id, name: jardinagemName.trim(), image_url: jardinagemImageUrl });
                  } else {
                    await createJardinagem.mutateAsync({ name: jardinagemName.trim(), image_url: jardinagemImageUrl });
                  }
                  setEditingJardinagem(null);
                  setJardinagemImageUrl(null);
                  setJardinagemOpen(false);
                }}
                disabled={createJardinagem.isPending || updateJardinagem.isPending}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {editingJardinagem ? "Salvar" : "Cadastrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={!!deleteJardinagemTarget} onOpenChange={(o) => !o && setDeleteJardinagemTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Remover equipamento?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Tem certeza que deseja remover <strong>{deleteJardinagemTarget?.name}</strong>?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteJardinagemTarget(null)}>Cancelar</Button>
              <Button
                variant="destructive"
                onClick={async () => {
                  if (!deleteJardinagemTarget) return;
                  await deleteJardinagem.mutateAsync(deleteJardinagemTarget.id);
                  setDeleteJardinagemTarget(null);
                }}
                disabled={deleteJardinagem.isPending}
              >
                Remover
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
