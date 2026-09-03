import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileUp, FileText, Check, Loader2, X, Trash2, Eye, Download } from "lucide-react";
import { toast } from "sonner";

interface NrFileUploadProps {
  colaboradorId: number | string;
  nrCode: string;
  currentUrl?: string;
  onUploadComplete: (url: string) => void;
  onRemove: () => void;
}

export const NrFileUpload = ({ 
  colaboradorId, 
  nrCode, 
  currentUrl, 
  onUploadComplete,
  onRemove
}: NrFileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5MB.");
      return;
    }

    // Validate type
    const allowedTypes = ["application/pdf", "image/jpeg", "image/png"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato inválido. Use PDF, JPG ou PNG.");
      return;
    }

    try {
      setIsUploading(true);
      
      const fileExt = file.name.split(".").pop();
      const filePath = `nrs/${colaboradorId}/${nrCode}_${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("documents")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);

      onUploadComplete(publicUrl);
      toast.success(`Documento ${nrCode} enviado com sucesso!`);
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast.error("Erro ao enviar arquivo.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (currentUrl) {
    const handleDownload = async () => {
      try {
        const response = await fetch(currentUrl);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        const fileName = currentUrl.split('/').pop() || `nr_${nrCode}.pdf`;
        link.setAttribute('download', fileName);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
      } catch (error) {
        toast.error("Erro ao baixar arquivo.");
      }
    };

    return (
      <div className="flex items-center justify-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-primary hover:bg-primary/10"
          title="Visualizar"
          asChild
        >
          <a href={currentUrl} target="_blank" rel="noopener noreferrer">
            <Eye className="w-4 h-4" />
          </a>
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-green-500 hover:bg-green-500/10"
          title="Baixar"
          onClick={handleDownload}
        >
          <Download className="w-4 h-4" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          title="Excluir"
          onClick={onRemove}
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    );
  }

  return (
    <div>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleUpload}
        className="hidden"
        accept=".pdf,image/*"
      />
      <Button
        variant="outline"
        size="sm"
        className="h-6 text-[10px] gap-1 px-2"
        disabled={isUploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {isUploading ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <FileUp className="w-3 h-3" />
        )}
        Upload
      </Button>
    </div>
  );
};
