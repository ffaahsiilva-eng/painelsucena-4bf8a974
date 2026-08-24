import { useState } from "react";
import { DeleteConfirmation } from "@/components/ui/DeleteConfirmation";
import { EditablePageTitle } from "@/components/cms/EditablePageTitle";
import Layout from "@/components/layout/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  FileText,
  Search,
  Trash2,
  RefreshCw,
  X,
  Check,
  AlertTriangle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { AddDocumentDialog } from "@/components/documents/AddDocumentDialog";
import { EditDocumentDialog } from "@/components/documents/EditDocumentDialog";
import { DocumentHistoryDialog } from "@/components/documents/DocumentHistoryDialog";
import {
  useDocuments,
  useUpdateDocument,
  useDeleteDocument,
  Document,
  DocumentType,
  DocumentStatus,
  DOCUMENT_TYPE_LABELS,
  DOCUMENT_STATUS_LABELS,
} from "@/hooks/useDocuments";
import { useCreateDocumentHistory } from "@/hooks/useDocumentHistory";
import { getDaysUntilEventBrazilNorth } from "@/lib/timezone";
import { useAuth } from "@/hooks/useAuth";
import { useVisualizadorContext } from "@/contexts/VisualizadorContext";

const Documentos = () => {
  const { user } = useAuth();
  const { isVisualizador } = useVisualizadorContext();
  const { data: documents, isLoading } = useDocuments();
  const updateDocument = useUpdateDocument();
  const deleteDocument = useDeleteDocument();
  const createHistory = useCreateDocumentHistory();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<DocumentType | "all">("all");
  const [filterStatus, setFilterStatus] = useState<DocumentStatus | "all">("all");

  const filteredDocuments = documents?.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || doc.document_type === filterType;
    const matchesStatus = filterStatus === "all" || doc.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const handleUpdateStatus = async (doc: Document, status: DocumentStatus) => {
    try {
      await updateDocument.mutateAsync({ id: doc.id, status });
      
      // Record history
      await createHistory.mutateAsync({
        document_id: doc.id,
        change_type: "status_change",
        previous_status: doc.status,
        new_status: status,
      });
      
      toast.success(`Status atualizado para: ${DOCUMENT_STATUS_LABELS[status]}`);
    } catch (error) {
      toast.error("Erro ao atualizar status");
    }
  };

  const handleDelete = async (doc: Document) => {
    try {
      await deleteDocument.mutateAsync(doc.id);
      toast.success("Documento excluído com sucesso");
    } catch (error) {
      toast.error("Erro ao excluir documento");
    }
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case "pending":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{DOCUMENT_STATUS_LABELS.pending}</Badge>;
      case "updated":
        return <Badge variant="default" className="bg-green-600"><Check className="h-3 w-3 mr-1" />{DOCUMENT_STATUS_LABELS.updated}</Badge>;
      case "cancelled":
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" />{DOCUMENT_STATUS_LABELS.cancelled}</Badge>;
    }
  };

  const getExpiryBadge = (expiryDate: string, status: DocumentStatus) => {
    if (status !== "pending") return null;

    const daysUntil = getDaysUntilEventBrazilNorth(expiryDate);

    if (daysUntil < 0) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Vencido</Badge>;
    } else if (daysUntil === 0) {
      return <Badge variant="destructive"><AlertTriangle className="h-3 w-3 mr-1" />Vence hoje</Badge>;
    } else if (daysUntil <= 5) {
      return <Badge variant="outline" className="border-orange-500 text-orange-500"><AlertTriangle className="h-3 w-3 mr-1" />{daysUntil} dias</Badge>;
    }
    return null;
  };

  // Stats
  const pendingCount = documents?.filter((d) => d.status === "pending").length || 0;
  const expiringCount = documents?.filter((d) => {
    if (d.status !== "pending") return false;
    const days = getDaysUntilEventBrazilNorth(d.expiry_date);
    return days >= 0 && days <= 5;
  }).length || 0;
  const expiredCount = documents?.filter((d) => {
    if (d.status !== "pending") return false;
    return getDaysUntilEventBrazilNorth(d.expiry_date) < 0;
  }).length || 0;

  return (
    <Layout>
      <div className="container mx-auto px-4 sm:px-6 py-4 sm:py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-xl sm:text-3xl font-bold flex items-center gap-2">
              <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
              <EditablePageTitle pageKey="documentos" defaultValue="Documentos" className="inline" as="h1" />
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie documentos e controle vencimentos
            </p>
          </div>
          {!isVisualizador && <AddDocumentDialog />}
        </div>

        <Tabs defaultValue="documentos" className="w-full">
          <TabsList className="mb-4 w-full justify-start flex-wrap h-auto gap-1">
            <TabsTrigger value="documentos">Permissão de Trabalho</TabsTrigger>
            <TabsTrigger value="lista-atividades">Atividades sem PT</TabsTrigger>
          </TabsList>

          <TabsContent value="documentos">
            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 sm:mb-6">
              <Card>
                <CardContent className="p-2 sm:p-4 flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-full bg-blue-100 dark:bg-blue-900/30 shrink-0">
                    <FileText className="h-4 w-4 sm:h-6 sm:w-6 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold">{pendingCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Pendentes</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 sm:p-4 flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-full bg-orange-100 dark:bg-orange-900/30 shrink-0">
                    <Clock className="h-4 w-4 sm:h-6 sm:w-6 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold">{expiringCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">A vencer</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-2 sm:p-4 flex items-center gap-2 sm:gap-4">
                  <div className="p-2 sm:p-3 rounded-full bg-red-100 dark:bg-red-900/30 shrink-0">
                    <AlertTriangle className="h-4 w-4 sm:h-6 sm:w-6 text-red-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xl sm:text-2xl font-bold">{expiredCount}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">Vencidos</p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filters */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por título ou descrição..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <Select value={filterType} onValueChange={(v) => setFilterType(v as DocumentType | "all")}>
                    <SelectTrigger className="w-full md:w-[200px]">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os tipos</SelectItem>
                      {Object.entries(DOCUMENT_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as DocumentStatus | "all")}>
                    <SelectTrigger className="w-full md:w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      {Object.entries(DOCUMENT_STATUS_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>{label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card>
              <CardHeader>
                <CardTitle>Lista de Documentos</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Carregando documentos...
                  </div>
                ) : filteredDocuments?.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum documento encontrado
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Título</TableHead>
                          <TableHead className="hidden sm:table-cell">Tipo</TableHead>
                          <TableHead>Vencimento</TableHead>
                          <TableHead className="hidden sm:table-cell">Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments?.map((doc) => (
                          <TableRow key={doc.id} className="virtual-row">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="flex-1">
                                  <p className="font-medium">{doc.title}</p>
                                  {doc.description && (
                                    <p className="text-sm text-muted-foreground truncate max-w-[200px]">
                                      {doc.description}
                                    </p>
                                  )}
                                </div>
                                {doc.file_url && !isVisualizador && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="text-primary hover:text-primary/80"
                                    onClick={() => window.open(doc.file_url!, "_blank")}
                                    title="Abrir arquivo PDF"
                                  >
                                    <ExternalLink className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <Badge variant="outline">
                                {DOCUMENT_TYPE_LABELS[doc.document_type]}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span className="text-xs sm:text-sm">
                                  {format(new Date(doc.expiry_date + "T12:00:00"), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                                {getExpiryBadge(doc.expiry_date, doc.status)}
                                <span className="sm:hidden">{getStatusBadge(doc.status)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell">{getStatusBadge(doc.status)}</TableCell>
                            <TableCell>
                              <div className="flex items-center justify-end gap-1">
                                {!isVisualizador && doc.status === "pending" && (
                                  <>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-green-600 hover:text-green-700"
                                      onClick={() => handleUpdateStatus(doc, "updated")}
                                      title="Marcar como atualizado"
                                    >
                                      <RefreshCw className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="text-orange-600 hover:text-orange-700"
                                      onClick={() => handleUpdateStatus(doc, "cancelled")}
                                      title="Cancelar documento"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                                <DocumentHistoryDialog documentId={doc.id} documentTitle={doc.title} />
                                {!isVisualizador && <EditDocumentDialog document={doc} />}
                                {!isVisualizador && doc.created_by === user?.id && (
                                  <DeleteConfirmation
                                    onConfirm={() => handleDelete(doc)}
                                  />
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="lista-atividades">
            <Card>
              <CardHeader>
                <CardTitle className="text-base sm:text-lg">
                  Lista de Atividades que NÃO requerem Permissão de Trabalho (PT) Principal
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="w-full flex justify-center">
                  <img loading="lazy" decoding="async"
                    src="/images/lista-atividades-sem-pt.jpg"
                    alt="Lista de Atividades que NÃO requerem Permissão de Trabalho (PT) Principal"
                    className="w-full max-w-4xl rounded-lg shadow-md"
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Documentos;

