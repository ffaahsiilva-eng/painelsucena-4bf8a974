import { useState } from "react";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useIsAdmin } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileText, Upload, Search, Trash2, Download, Plus, X, Eye } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const NotasFiscais = () => {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isAdmin } = useIsAdmin();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [titulo, setTitulo] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const canEdit = isAdmin || profile?.cargo === "aux_administrativo" || profile?.cargo === "preposto";

  // Extrai o path interno do bucket a partir do file_url salvo.
  // Suporta tanto URLs públicas legadas (/storage/v1/object/public/notas-fiscais/<path>)
  // quanto paths já normalizados (uploads novos).
  const extractPath = (fileUrl: string): string => {
    const marker = "/notas-fiscais/";
    const idx = fileUrl.indexOf(marker);
    if (idx >= 0) return fileUrl.substring(idx + marker.length).split("?")[0];
    return fileUrl;
  };

  const getSignedUrl = async (fileUrl: string): Promise<string | null> => {
    const path = extractPath(fileUrl);
    const { data, error } = await supabase.storage
      .from("notas-fiscais")
      .createSignedUrl(path, 300); // 5 min
    if (error || !data) {
      toast.error("Não foi possível abrir o arquivo");
      return null;
    }
    return data.signedUrl;
  };

  const handlePreview = async (fileUrl: string) => {
    const url = await getSignedUrl(fileUrl);
    if (url) setPreviewUrl(url);
  };

  const handleDownload = async (fileUrl: string, fileName?: string | null) => {
    const url = await getSignedUrl(fileUrl);
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    if (fileName) a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const { data: notas, isLoading } = useQuery({
    queryKey: ["notas-fiscais"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notas_fiscais")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createNota = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      let fileUrl: string | null = null;
      let fileName: string | null = null;

      if (file) {
        const ext = file.name.split(".").pop();
        const path = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("notas-fiscais")
          .upload(path, file);
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("notas-fiscais")
          .getPublicUrl(path);
        // Bucket é privado: guardamos apenas o path. URLs assinadas são geradas sob demanda.
        // Mantemos getPublicUrl apenas para compatibilidade da extração (não funciona como URL).
        fileUrl = path;
        void urlData;
        fileName = file.name;
      }

      const { error } = await supabase.from("notas_fiscais").insert({
        numero: titulo,
        fornecedor: titulo,
        valor: null,
        data_emissao: format(new Date(), "yyyy-MM-dd"),
        descricao: null,
        file_url: fileUrl,
        file_name: fileName,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal salva com sucesso!");
      resetForm();
    },
    onError: (error: Error) => {
      toast.error("Erro ao salvar nota fiscal: " + error.message);
    },
  });

  const deleteNota = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notas_fiscais").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notas-fiscais"] });
      toast.success("Nota fiscal excluída!");
    },
    onError: () => toast.error("Erro ao excluir nota fiscal"),
  });

  const resetForm = () => {
    setDialogOpen(false);
    setTitulo("");
    setFile(null);
  };

  const handleSubmit = async () => {
    if (!titulo) {
      toast.error("Preencha o título da nota fiscal");
      return;
    }
    setUploading(true);
    await createNota.mutateAsync();
    setUploading(false);
  };

  const filtered = notas?.filter((n) => {
    const term = searchTerm.toLowerCase();
    return n.numero.toLowerCase().includes(term);
  });

  return (
    <div className="min-h-screen bg-background p-4 md:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary" />
          <EditablePageTitle pageKey="notas-fiscais" defaultValue="Notas Fiscais" className="text-2xl font-bold text-foreground" />
          {notas && (
            <Badge variant="secondary" className="text-xs">
              {notas.length} registros
            </Badge>
          )}
        </div>

        {canEdit && (
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Nota Fiscal
          </Button>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por título..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered && filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <Table>
                 <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead className="hidden sm:table-cell">Data</TableHead>
                    <TableHead>Arquivo</TableHead>
                    {isAdmin && <TableHead className="w-16">Ação</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((nota) => (
                    <TableRow key={nota.id}>
                      <TableCell className="font-medium">{nota.numero}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {format(new Date(nota.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {nota.file_url ? (
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handlePreview(nota.file_url!)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0"
                              onClick={() => handleDownload(nota.file_url!, nota.file_name)}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">-</span>
                        )}
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm("Excluir esta nota fiscal?")) {
                                deleteNota.mutate(nota.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="p-12 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Nenhuma nota fiscal encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Nova Nota Fiscal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Título da Nota Fiscal *</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: NF 12345 - Fornecedor" />
            </div>
            <div>
              <Label>Arquivo (PDF/Imagem)</Label>
              <Input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
              {file && <p className="text-xs text-muted-foreground mt-1">{file.name}</p>}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={resetForm}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={uploading} className="gap-2">
              {uploading ? "Salvando..." : <>
                <Upload className="h-4 w-4" />
                Salvar
              </>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Visualizar Arquivo</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            /\.pdf(\?|$)/i.test(previewUrl) ? (
              <iframe src={previewUrl} className="w-full h-[70vh] rounded-md" />
            ) : (
              <img loading="lazy" decoding="async" src={previewUrl} alt="Nota Fiscal" className="w-full max-h-[70vh] object-contain rounded-md" />
            )
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotasFiscais;
