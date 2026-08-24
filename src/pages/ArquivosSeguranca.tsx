import { useState, useRef } from "react";
import Layout from "@/components/layout/Layout";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import { EditableText } from "@/components/cms/EditableText";
import { EditableImage } from "@/components/cms/EditableImage";
import { useEditMode } from "@/contexts/EditModeContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Upload,
  FileText,
  Download,
  Trash2,
  Eye,
  Search,
  FileImage,
  FileSpreadsheet,
  File,
} from "lucide-react";
import { AnimatedDownloadButton } from "@/components/ui/AnimatedDownloadButton";
import { useSecurityFiles, SecurityFile, SECURITY_FILE_CATEGORIES, ADMIN_ONLY_CATEGORIES } from "@/hooks/useSecurityFiles";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useVisualizadorContext } from "@/contexts/VisualizadorContext";
import { useIsAdmin } from "@/hooks/useUserRole";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import iconEncarregado from "@/assets/icons/icon-encarregado.png";
import iconMeioAmbiente from "@/assets/icons/icon-meio-ambiente.png";
import iconSeguranca from "@/assets/icons/icon-seguranca.png";
import iconPreposto from "@/assets/icons/icon-preposto.png";
import iconPlanejamento from "@/assets/icons/icon-planejamento.png";
import iconAdministrativo from "@/assets/icons/icon-administrativo.png";
import iconAlmoxarifado from "@/assets/icons/icon-almoxarifado.png";
import iconTransporte from "@/assets/icons/icon-transporte.png";
import iconConfidencial from "@/assets/crown-folder.png";
import winrarIcon from "@/assets/winrar-icon.png";

const FilePdfIcon = FileText;

type FileIconComponent = React.ComponentType<{ className?: string }>;

function getFileIcon(fileType: string | null) {
  if (!fileType) return File;
  if (fileType.includes("pdf")) return FilePdfIcon;
  if (fileType.includes("image")) return FileImage;
  if (fileType.includes("sheet") || fileType.includes("excel") || fileType.includes("csv"))
    return FileSpreadsheet;
  if (fileType.includes("zip") || fileType.includes("rar") || fileType.includes("compressed") || fileType.includes("archive"))
    return File;
  return FileText;
}

function getFileLabel(fileType: string | null, fileName: string | null): string | null {
  if (fileType?.includes("pdf")) return "PDF";
  if (fileType?.includes("zip") || fileName?.endsWith(".zip")) return "ZIP";
  if (fileType?.includes("rar") || fileName?.endsWith(".rar")) return "RAR";
  if (fileType?.includes("7z") || fileName?.endsWith(".7z")) return "7Z";
  if (fileType?.includes("image")) return "IMG";
  if (fileType?.includes("sheet") || fileType?.includes("excel")) return "XLS";
  if (fileType?.includes("csv") || fileName?.endsWith(".csv")) return "CSV";
  if (fileType?.includes("word") || fileName?.endsWith(".doc") || fileName?.endsWith(".docx")) return "DOC";
  if (fileType?.includes("presentation") || fileName?.endsWith(".ppt") || fileName?.endsWith(".pptx")) return "PPT";
  if (fileName?.endsWith(".txt")) return "TXT";
  return null;
}

function formatFileSize(bytes: number | null) {
  if (!bytes) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function SecurityFilePreview({
  file,
  fileLabel,
  FileIcon,
}: {
  file: SecurityFile;
  fileLabel: string | null;
  FileIcon: FileIconComponent;
}) {
  const [previewFailed, setPreviewFailed] = useState(false);
  const isImage = file.file_type?.includes("image");
  const isPdf =
    file.file_type?.includes("pdf") || file.file_name.toLowerCase().endsWith(".pdf");
  const isExcel =
    file.file_type?.includes("sheet") || file.file_type?.includes("excel") ||
    file.file_name.toLowerCase().endsWith(".xls") || file.file_name.toLowerCase().endsWith(".xlsx");
  const isCompressed =
    file.file_type?.includes("zip") || file.file_type?.includes("rar") || file.file_type?.includes("compressed") || file.file_type?.includes("archive") ||
    file.file_name.toLowerCase().endsWith(".zip") || file.file_name.toLowerCase().endsWith(".rar") || file.file_name.toLowerCase().endsWith(".7z");

  if (isImage && !previewFailed) {
    return (
      <img
        src={file.file_url}
        alt={file.file_name}
        className="h-full w-full object-cover"
        loading="lazy"
        onError={() => setPreviewFailed(true)}
      />
    );
  }

  if (isPdf && !previewFailed) {
    return (
      <object
        data={`${file.file_url}#toolbar=0&navpanes=0&scrollbar=0`}
        type="application/pdf"
        className="h-full w-full pointer-events-none"
        aria-label={`Pré-visualização de ${file.file_name}`}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <FileIcon className="h-16 w-16 text-muted-foreground/70" />
          {fileLabel && (
            <span className="absolute inset-0 flex items-center justify-center pt-2 text-[10px] font-bold text-muted-foreground">
              {fileLabel}
            </span>
          )}
        </div>
      </object>
    );
  }

  if (isExcel && !previewFailed) {
    const viewerUrl = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(file.file_url)}`;
    return (
      <iframe
        src={viewerUrl}
        className="h-full w-full pointer-events-none border-0"
        title={`Pré-visualização de ${file.file_name}`}
        onError={() => setPreviewFailed(true)}
      />
    );
  }

  if (isCompressed) {
    return (
      <div className="relative flex h-full w-full items-center justify-center">
        <img loading="lazy" decoding="async" src={winrarIcon} alt="Arquivo compactado" className="h-20 w-20 object-contain" />
      </div>
    );
  }

  return (
    <div className="relative">
      <FileIcon className="h-16 w-16 text-muted-foreground/70" />
      {fileLabel && (
        <span className="absolute inset-0 flex items-center justify-center pt-2 text-[10px] font-bold text-muted-foreground">
          {fileLabel}
        </span>
      )}
    </div>
  );
}

const CATEGORY_IMAGES: Record<string, string> = {
  Encarregado: iconEncarregado,
  "Tec Meio Ambiente": iconMeioAmbiente,
  "Tec Segurança": iconSeguranca,
  Preposto: iconPreposto,
  Planejamento: iconPlanejamento,
  Administrativo: iconAdministrativo,
  Almoxarifado: iconAlmoxarifado,
  Transporte: iconTransporte,
  Confidencial: iconConfidencial,
};

export default function ArquivosSeguranca() {
  const { files, isLoading, uploadFile, deleteFile } = useSecurityFiles();
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const { isVisualizador } = useVisualizadorContext();
  const { isAdmin } = useIsAdmin();
  const { isEditMode } = useEditMode();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SecurityFile | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // If no category selected, show the category selector
  if (!selectedCategory) {
    return (
      <Layout>
        <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-3 sm:py-6">
          <div>
            <EditablePageTitle pageKey="arquivos-seguranca" defaultValue="Documentos" className="text-xl sm:text-3xl font-bold tracking-tight" />
            <p className="text-xs sm:text-sm text-muted-foreground">
              Selecione a categoria para visualizar os documentos
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {SECURITY_FILE_CATEGORIES
              .filter((cat) => !ADMIN_ONLY_CATEGORIES.includes(cat) || isAdmin)
              .map((cat) => {
              const count = files.filter((f) => f.category === cat).length;
              const catImage = CATEGORY_IMAGES[cat];
              return (
                <Card
                  key={cat}
                  className="cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                  onClick={() => setSelectedCategory(cat)}
                >
                  <CardContent className="flex flex-col items-center justify-center p-6 text-center gap-2">
                    <EditableImage
                      pageKey="arquivos-seguranca"
                      elementKey={`cat-icon-${cat}`}
                      defaultSrc={catImage}
                      alt={cat}
                      canEdit={isEditMode}
                      imgClassName="h-16 w-16 object-contain"
                    />
                    <EditableText
                      pageKey="arquivos-seguranca"
                      elementKey={`cat-name-${cat}`}
                      defaultValue={cat}
                      canEdit={isEditMode}
                      as="h3"
                      className="font-semibold text-sm sm:text-base"
                    />
                    <span className="text-xs text-muted-foreground">
                      {count} {count === 1 ? "arquivo" : "arquivos"}
                    </span>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </Layout>
    );
  }

  const filteredFiles = files
    .filter((file) => file.category === selectedCategory)
    .filter((file) => file.file_name.toLowerCase().includes(search.toLowerCase()));

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || !user || !profile) return;

    setIsUploading(true);
    try {
      for (const file of Array.from(selectedFiles)) {
        await uploadFile.mutateAsync({
          file,
          userId: user.id,
          userName: profile.full_name,
          category: selectedCategory,
        });
      }
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleView = (file: SecurityFile) => {
    window.open(file.file_url, "_blank");
  };

  const handleDownload = (file: SecurityFile) => {
    const link = document.createElement("a");
    link.href = file.file_url;
    link.download = file.file_name;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await deleteFile.mutateAsync(deleteTarget);
    setDeleteTarget(null);
  };

  return (
    <Layout>
      <div className="space-y-4 sm:space-y-6 px-3 sm:px-6 py-3 sm:py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setSelectedCategory(null)}>
                ← Voltar
              </Button>
              <h1 className="text-xl sm:text-3xl font-bold tracking-tight">
                {selectedCategory}
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground ml-10">
              Documentos da categoria {selectedCategory}
            </p>
          </div>

          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={handleFileSelect}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.txt,.zip,.rar,.7z"
            />
            {!isVisualizador && (
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || !user || !profile}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                {isUploading ? "Enviando..." : "Enviar Arquivo"}
              </Button>
            )}
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <CardTitle className="text-lg">Arquivos ({filteredFiles.length})</CardTitle>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar arquivo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <Skeleton key={i} className="h-48 rounded-lg" />
                ))}
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <FileText className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Nenhum arquivo encontrado</h3>
                <p className="text-muted-foreground">
                  {search
                    ? "Tente uma busca diferente"
                    : "Clique em 'Enviar Arquivo' para adicionar"}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filteredFiles.map((file) => {
                  const FileIcon = getFileIcon(file.file_type);
                  const fileLabel = getFileLabel(file.file_type, file.file_name);
                  return (
                    <Card
                      key={file.id}
                      className="group relative overflow-hidden transition-shadow hover:shadow-lg"
                    >
                      <div
                        className="relative flex h-32 cursor-pointer items-center justify-center bg-muted/50 transition-colors hover:bg-muted overflow-hidden"
                        onClick={() => handleView(file)}
                      >
                        <SecurityFilePreview
                          file={file}
                          fileLabel={fileLabel}
                          FileIcon={FileIcon}
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                          <Eye className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <CardContent className="p-3">
                        <h4
                          className="cursor-pointer truncate font-medium hover:text-primary"
                          onClick={() => handleView(file)}
                          title={file.file_name}
                        >
                          {file.file_name}
                        </h4>
                        <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatFileSize(file.file_size)}</span>
                          <span>
                            {format(new Date(file.created_at), "dd/MM/yy", { locale: ptBR })}
                          </span>
                        </div>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          Por: {file.uploaded_by_name}
                        </p>
                        <div className="mt-3 flex gap-2">
                          {!isVisualizador && (
                            <AnimatedDownloadButton 
                              onDownload={() => handleDownload(file)}
                              className="flex-1"
                            />
                          )}
                          {!isVisualizador &&
                            (user?.id === file.uploaded_by ||
                              profile?.cargo === "preposto") && (
                              <Button
                                variant="outline"
                                size="sm"
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                                onClick={() => setDeleteTarget(file)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Excluir arquivo?</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir "{deleteTarget?.file_name}"? Esta ação não pode
                ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
