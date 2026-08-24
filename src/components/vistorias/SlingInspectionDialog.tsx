import { useEffect, useState } from "react";
import { Check, X, Upload, Loader2, Image as ImageIcon, Save } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { colorLabels, colorClasses, type SlingWithInspection } from "@/hooks/useSlingEquipment";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SlingInspectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sling: SlingWithInspection | null;
  onConfirm: (
    status: "inspected" | "cancelled",
    notes: string,
    photoUrl: string | null,
    inspectionDate: string | null,
  ) => void;
  isLoading?: boolean;
  canManagePhoto?: boolean;
}

export function SlingInspectionDialog({
  open,
  onOpenChange,
  sling,
  onConfirm,
  isLoading,
  canManagePhoto = false,
}: SlingInspectionDialogProps) {
  const [notes, setNotes] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [inspectionDate, setInspectionDate] = useState<string>("");

  useEffect(() => {
    if (open) {
      setNotes(sling?.currentInspection?.notes ?? "");
      setPhotoUrl(sling?.currentInspection?.photo_url ?? null);
      const existing = sling?.currentInspection?.inspected_at;
      setInspectionDate(
        existing
          ? new Date(existing).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
      );
    }
  }, [open, sling]);

  const handleUpload = async (file: File) => {
    if (!sling) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `slings/${sling.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("inspection-photos")
        .upload(path, file, { upsert: true });
      if (error) throw error;
      const { data } = supabase.storage.from("inspection-photos").getPublicUrl(path);
      setPhotoUrl(data.publicUrl);
      toast.success("Foto carregada");
    } catch (e) {
      toast.error("Erro ao carregar foto");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = (status: "inspected" | "cancelled") => {
    const isoDate = inspectionDate
      ? new Date(`${inspectionDate}T12:00:00`).toISOString()
      : null;
    onConfirm(status, notes, photoUrl, isoDate);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setNotes("");
      setPhotoUrl(null);
    }
    onOpenChange(nextOpen);
  };

  if (!sling) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto w-[calc(100vw-2rem)]">
        <DialogHeader>
          <DialogTitle>Registrar Inspeção</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 flex-wrap">
            <div className={`w-6 h-6 rounded-full shrink-0 ${colorClasses[sling.color]}`} />
            <div className="flex-1 min-w-0">
              <p className="font-mono font-medium truncate">{sling.tag}</p>
              <p className="text-sm text-muted-foreground truncate">{sling.description}</p>
            </div>
            <Badge variant="outline" className="shrink-0">{colorLabels[sling.color]}</Badge>
          </div>

          {canManagePhoto && (
            <div className="space-y-2">
              <Label htmlFor="inspection-date">Data da Inspeção</Label>
              <Input
                id="inspection-date"
                type="date"
                value={inspectionDate}
                onChange={(e) => setInspectionDate(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Observações da Vistoria</Label>
            <Textarea
              id="notes"
              placeholder="Descreva os achados durante a inspeção, condição da cinta, etc..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>

          {canManagePhoto && (
            <div className="space-y-2">
              <Label>Foto da Cinta</Label>
              {photoUrl ? (
                <div className="relative rounded-lg overflow-hidden border">
                  <img src={photoUrl} alt="Foto da cinta" className="w-full max-h-64 object-contain bg-muted" />
                  <Button
                    type="button"
                    size="sm"
                    variant="destructive"
                    className="absolute top-2 right-2 h-7 gap-1"
                    onClick={() => setPhotoUrl(null)}
                  >
                    <X className="w-3 h-3" /> Remover
                  </Button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  {uploading ? (
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Upload className="w-3.5 h-3.5" /> Enviar foto da cinta
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    disabled={uploading}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleUpload(file);
                      e.target.value = "";
                    }}
                  />
                </label>
              )}
            </div>
          )}

          {canManagePhoto ? (
            <div className="space-y-2 pt-2">
              <Label>Status</Label>
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant={sling.currentInspection?.status === "inspected" ? "default" : "outline"}
                  className={`flex-1 gap-2 ${sling.currentInspection?.status === "inspected" ? "bg-green-600 hover:bg-green-700 text-white" : ""}`}
                  onClick={() => handleConfirm("inspected")}
                  disabled={isLoading || uploading}
                >
                  <Save className="w-4 h-4" />
                  Salvar como Inspecionada
                </Button>
                <Button
                  type="button"
                  variant={sling.currentInspection?.status === "cancelled" ? "destructive" : "outline"}
                  className="flex-1 gap-2"
                  onClick={() => handleConfirm("cancelled")}
                  disabled={isLoading || uploading}
                >
                  <Save className="w-4 h-4" />
                  Salvar como Cancelada
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 pt-2">
              <Button
                className="flex-1 gap-2 bg-green-600 hover:bg-green-700"
                onClick={() => handleConfirm("inspected")}
                disabled={isLoading || uploading}
              >
                <Check className="w-4 h-4" />
                Inspecionada
              </Button>
              <Button
                variant="destructive"
                className="flex-1 gap-2"
                onClick={() => handleConfirm("cancelled")}
                disabled={isLoading || uploading}
              >
                <X className="w-4 h-4" />
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
