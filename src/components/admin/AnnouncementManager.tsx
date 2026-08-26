import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAnnouncements, Announcement } from "@/hooks/useAnnouncements";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Megaphone, Upload, Trash2, Users, User, Clock, Eye, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { resolveStorageUrl } from "@/lib/storage";
import { AnnouncementImage } from "@/components/announcements/AnnouncementImage";
import { compressImage } from "@/utils/imageCompression";


interface Profile {
  user_id: string;
  full_name: string;
}

export function AnnouncementManager() {
  const { announcements, allReads, isLoading, createAnnouncement, deleteAnnouncement } = useAnnouncements();
  const [isCreating, setIsCreating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [resolvedImageUrl, setResolvedImageUrl] = useState<string | null>(null);
  // Prévia local imediata (object URL) exibida antes do upload terminar
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<"all" | "specific">("all");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [targetEnvironments, setTargetEnvironments] = useState<string[]>(["barcarena", "paragominas"]);

  // Fetch all profiles for user selection
  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles-for-announcements"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name");

      if (error) throw error;
      return data as Profile[];
    },
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setImagePath(null);
    setResolvedImageUrl(null);
    clearLocalPreview();
    setTargetType("all");
    setSelectedUsers([]);
    setIsScheduled(false);
    setScheduledDate("");
    setScheduledTime("");
    setTargetEnvironments(["barcarena", "paragominas"]);
    setIsCreating(false);
  };

  const clearLocalPreview = () => {
    setLocalPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    // Prévia imediata antes de qualquer requisição
    clearLocalPreview();
    setLocalPreviewUrl(URL.createObjectURL(file));

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `announcements/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(filePath, await compressImage(file), { cacheControl: '3600', upsert: true });

      if (uploadError) throw uploadError;
      
      setImagePath(filePath);
      // O hook já resolve as URLs, mas para o formulário resolvemos na hora para preview imediato
      const resolved = await resolveStorageUrl(filePath);
      setResolvedImageUrl(resolved);
      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Error uploading image:", error);
      clearLocalPreview();
      toast.error("Erro ao enviar imagem.");
    } finally {
      setIsUploading(false);
    }
  };

  // A prévia local tem prioridade: aparece instantaneamente, sem esperar o upload
  const previewImageUrl = localPreviewUrl || resolvedImageUrl;

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Preencha o título e o conteúdo.");
      return;
    }

    if (targetType === "specific" && selectedUsers.length === 0) {
      toast.error("Selecione pelo menos um usuário.");
      return;
    }

    if (targetEnvironments.length === 0) {
      toast.error("Selecione pelo menos um ambiente.");
      return;
    }

    let scheduledAt: string | null = null;
    if (isScheduled && scheduledDate && scheduledTime) {
      scheduledAt = new Date(`${scheduledDate}T${scheduledTime}`).toISOString();
    }

    await createAnnouncement.mutateAsync({
      title: title.trim(),
      content: content.trim(),
      image_url: imagePath,
      target_type: targetType,
      target_users: targetType === "specific" ? selectedUsers : [],
      scheduled_at: scheduledAt,
      environments: targetEnvironments,
    });

    resetForm();
  };

  const toggleEnvironment = (env: string) => {
    setTargetEnvironments((prev) =>
      prev.includes(env) ? prev.filter((e) => e !== env) : [...prev, env]
    );
  };

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const getReadCount = (announcementId: string) => {
    return allReads.filter((r) => r.announcement_id === announcementId).length;
  };

  const getTargetCount = (announcement: Announcement) => {
    if (announcement.target_type === "all") {
      return profiles.length;
    }
    return announcement.target_users?.length || 0;
  };

  const isPublished = (announcement: Announcement) => {
    return new Date(announcement.published_at) <= new Date();
  };

  return (
    <div className="space-y-6">
      {/* Create Announcement Section */}
      {!isCreating ? (
        <Card>
          <CardContent className="pt-6">
            <Button onClick={() => setIsCreating(true)} className="w-full">
              <Plus className="w-4 h-4 mr-2" />
              Criar Novo Comunicado
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Megaphone className="w-5 h-5" />
              Novo Comunicado
            </CardTitle>
            <CardDescription>
              Crie um comunicado para os usuários do sistema.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título do comunicado"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="content">Conteúdo</Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Escreva o conteúdo do comunicado..."
                className="min-h-[150px] transition-all focus:ring-2 focus:ring-primary/50"
              />
            </div>

            <div className="space-y-2">
              <Label>Banner (opcional)</Label>
              <div className="flex items-center gap-4">
                {previewImageUrl ? (
                  <div className="relative w-32 h-20 rounded-lg overflow-hidden">
                    <img loading="eager" decoding="sync" src={previewImageUrl} alt="Banner do comunicado" className="w-full h-full object-cover" />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-1 right-1 w-6 h-6"
                      onClick={() => {
                        setImagePath(null);
                        setResolvedImageUrl(null);
                        clearLocalPreview();
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Enviar Imagem
                      </>
                    )}
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>
            </div>

            {(title.trim() || content.trim() || previewImageUrl) && (
              <div className="space-y-2">
                <Label>Pré-visualização</Label>
                <div className="rounded-2xl overflow-hidden border p-4 sm:p-5 bg-muted/40">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">📢</span>
                    <span className="inline-block w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                    <p className="font-bold text-base truncate">
                      {title.trim() || "Título do comunicado"}
                    </p>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                  </p>

                  {previewImageUrl && (
                    <div className="mt-3 rounded-lg overflow-hidden border bg-background/50 relative">
                      <img
                        src={previewImageUrl}
                        alt="Prévia do banner do comunicado"
                        className="w-full h-auto max-h-64 object-contain block mx-auto"
                      />
                      {isUploading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-background/40">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-3 border-t pt-3">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">
                      {content.trim() || "Conteúdo do comunicado..."}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Ambientes alvo</Label>
              <div className="flex gap-2">
                {[
                  { id: "barcarena", label: "Barcarena - Alunorte" },
                  { id: "paragominas", label: "Paragominas" },
                ].map((env) => {
                  const active = targetEnvironments.includes(env.id);
                  return (
                    <button
                      key={env.id}
                      type="button"
                      onClick={() => toggleEnvironment(env.id)}
                      className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                        active
                          ? "border-primary bg-primary/10 text-foreground"
                          : "border-border bg-muted/30 text-muted-foreground hover:border-muted-foreground"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${
                          active ? "bg-primary border-primary text-primary-foreground" : "border-muted-foreground"
                        }`}>
                          {active && "✓"}
                        </span>
                        {env.label}
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                O comunicado será publicado em cada ambiente selecionado.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Destinatários</Label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as "all" | "specific")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Todos os usuários
                    </div>
                  </SelectItem>
                  <SelectItem value="specific">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4" />
                      Usuários específicos
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === "specific" && (
              <div className="space-y-2">
                <Label>Selecione os usuários</Label>
                <div className="border rounded-lg p-3 max-h-40 overflow-y-auto space-y-2">
                  {profiles.map((profile) => (
                    <div
                      key={profile.user_id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer transition-colors ${
                        selectedUsers.includes(profile.user_id)
                          ? "bg-primary/10 border border-primary"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => toggleUserSelection(profile.user_id)}
                    >
                      <div
                        className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selectedUsers.includes(profile.user_id)
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedUsers.includes(profile.user_id) && "✓"}
                      </div>
                      <span className="text-sm">{profile.full_name}</span>
                    </div>
                  ))}
                </div>
                {selectedUsers.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {selectedUsers.length} usuário(s) selecionado(s)
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Switch
                  id="scheduled"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                />
                <Label htmlFor="scheduled" className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  Agendar
                </Label>
              </div>
            </div>

            {isScheduled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="scheduled-date">Data</Label>
                  <Input
                    id="scheduled-date"
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scheduled-time">Hora</Label>
                  <Input
                    id="scheduled-time"
                    type="time"
                    value={scheduledTime}
                    onChange={(e) => setScheduledTime(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button variant="outline" onClick={resetForm} className="flex-1">
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createAnnouncement.isPending}
                className="flex-1"
              >
                {createAnnouncement.isPending ? "Criando..." : "Criar Comunicado"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Announcements List */}
      <Card>
        <CardHeader>
          <CardTitle>Comunicados</CardTitle>
          <CardDescription>
            Lista de todos os comunicados enviados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : announcements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum comunicado criado.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Destinatários</TableHead>
                  <TableHead>Publicação</TableHead>
                  <TableHead>Visualizações</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {announcements.map((announcement) => (
                  <TableRow key={announcement.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {announcement.image_url && (
                          <div className="w-8 h-8 shrink-0">
                            <AnnouncementImage
                              source={announcement.image_url}
                              className="w-8 h-8 rounded object-cover"
                            />
                          </div>
                        )}

                        <span className="truncate max-w-[200px]">{announcement.title}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={announcement.target_type === "all" ? "default" : "secondary"}>
                        {announcement.target_type === "all" ? (
                          <><Users className="w-3 h-3 mr-1" /> Todos</>
                        ) : (
                          <><User className="w-3 h-3 mr-1" /> {announcement.target_users?.length || 0}</>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {!isPublished(announcement) && (
                          <Clock className="w-3 h-3 text-yellow-500" />
                        )}
                        <span className="text-sm">
                          {format(new Date(announcement.published_at), "dd/MM/yyyy HH:mm", {
                            locale: ptBR,
                          })}
                        </span>
                      </div>
                      {!isPublished(announcement) && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Agendado
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm" className="gap-1 px-2">
                            <Eye className="w-4 h-4 text-muted-foreground" />
                            <span>
                              {getReadCount(announcement.id)} / {getTargetCount(announcement)}
                            </span>
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3" align="start">
                          <p className="text-sm font-medium mb-2">Visualizado por:</p>
                          {(() => {
                            const readers = allReads
                              .filter((r) => r.announcement_id === announcement.id)
                              .map((r) => {
                                const profile = profiles.find((p) => p.user_id === r.user_id);
                                return { name: profile?.full_name || "Usuário", read_at: r.read_at };
                              });
                            if (readers.length === 0) {
                              return <p className="text-xs text-muted-foreground">Ninguém visualizou ainda.</p>;
                            }
                            return (
                              <ScrollArea className="max-h-48">
                                <div className="space-y-1.5">
                                  {readers.map((reader, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs">
                                      <span className="truncate mr-2">{reader.name}</span>
                                      <span className="text-muted-foreground whitespace-nowrap">
                                        {format(new Date(reader.read_at), "dd/MM HH:mm")}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </ScrollArea>
                            );
                          })()}
                        </PopoverContent>
                      </Popover>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                        onClick={() => deleteAnnouncement.mutate(announcement.id)}
                        disabled={deleteAnnouncement.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
