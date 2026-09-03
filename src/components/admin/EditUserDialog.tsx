import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Camera, Upload } from "lucide-react";
import { ImageEditor } from "@/components/settings/ImageEditor";
import { NeonAvatar } from "@/components/ui/NeonAvatar";
import type { Database } from "@/integrations/supabase/types";

type CargoType = Database["public"]["Enums"]["cargo_type"];

const cargoLabels: Record<CargoType, string> = {
  moderador: "Moderador",
  preposto: "Preposto",
  encarregado_geral: "Encarregado Geral",
  encarregado_i: "Encarregado I",
  encarregado_ii: "Encarregado II",
  tecnico_seguranca_i: "Técnico de Segurança I",
  tecnico_seguranca_ii: "Técnico de Segurança II",
  tecnico_meio_ambiente: "Técnico Meio Ambiente",
  aux_administrativo: "Auxiliar Administrativo",
  aux_almoxarifado: "Auxiliar de Almoxarifado",
  planejador: "Planejador",
  engenheiro_civil: "Engenheiro Civil",
  engenheiro_planejamento: "Engenheiro de Planejamento",
  tecnico_planejamento: "Técnico de Planejamento",
  engenheiro_seguranca: "Engenheiro de Segurança",
  motorista_pipa: "Motorista de Pipa",
  motorista_munk: "Motorista Operador de Munk",
  visualizador: "Visualizador",
};

interface UserData {
  user_id: string;
  full_name: string | null;
  cargo?: CargoType;
  avatar_url?: string | null;
}

interface EditUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: UserData | null;
  onSuccess: () => void;
}

export const EditUserDialog = ({
  open,
  onOpenChange,
  user,
  onSuccess,
}: EditUserDialogProps) => {
  const [fullName, setFullName] = useState("");
  const [cargo, setCargo] = useState<CargoType | "">("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && user) {
      setIsFetching(true);
      // Fetch complete profile data
      supabase
        .from("profiles")
        .select("full_name, cargo, avatar_url")
        .eq("user_id", user.user_id)
        .single()
        .then(({ data, error }) => {
          if (!error && data) {
            setFullName(data.full_name || "");
            setCargo(data.cargo || "");
            setAvatarUrl(data.avatar_url || null);
          } else {
            setFullName(user.full_name || "");
          }
          setIsFetching(false);
        });
    }
  }, [open, user]);

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Por favor, selecione uma imagem válida.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditingImage(reader.result as string);
      setIsEditorOpen(true);
    };
    reader.readAsDataURL(file);
    if (event.target) event.target.value = "";
  };

  const handleSaveEditedImage = async (blob: Blob) => {
    if (!user) return;
    
    setIsUploadingAvatar(true);
    try {
      const fileName = `${user.user_id}/avatar.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("site-assets")
        .upload(fileName, blob, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("site-assets")
        .getPublicUrl(fileName);

      const newAvatarUrl = urlData.publicUrl + "?t=" + Date.now();
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ avatar_url: newAvatarUrl })
        .eq("user_id", user.user_id);

      if (updateError) throw updateError;

      setAvatarUrl(newAvatarUrl);
      toast.success("Foto de perfil atualizada!");
    } catch (error: any) {
      toast.error("Erro ao atualizar foto: " + error.message);
    } finally {
      setIsUploadingAvatar(false);
      setIsEditorOpen(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !fullName.trim() || !cargo) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName.trim(),
          cargo: cargo as CargoType,
        })
        .eq("user_id", user.user_id);

      if (error) throw error;

      toast.success("Usuário atualizado com sucesso!");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating user:", error);
      toast.error(`Erro ao atualizar usuário: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
          <DialogDescription>
            Altere as informações do perfil do usuário.
          </DialogDescription>
        </DialogHeader>

        {isFetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col items-center gap-4 py-2">
              <div className="relative">
                <NeonAvatar
                  src={avatarUrl}
                  name={fullName || "U"}
                  size="lg"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                  className="absolute bottom-0 right-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors z-20"
                >
                  {isUploadingAvatar ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Camera className="w-4 h-4" />
                  )}
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingAvatar}
              >
                <Upload className="w-4 h-4 mr-2" />
                {isUploadingAvatar ? "Enviando..." : "Alterar Foto"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fullName">Nome Completo</Label>
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Nome do usuário"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cargo">Cargo</Label>
              <Select
                value={cargo}
                onValueChange={(v) => setCargo(v as CargoType)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cargo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(cargoLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading || !fullName.trim() || !cargo}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Salvando...
                  </>
                ) : (
                  "Salvar"
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
        {editingImage && (
          <ImageEditor
            image={editingImage}
            open={isEditorOpen}
            onOpenChange={setIsEditorOpen}
            onSave={handleSaveEditedImage}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};
