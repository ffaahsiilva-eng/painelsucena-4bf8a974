import { History } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useDocumentHistory } from "@/hooks/useDocumentHistory";
import { DOCUMENT_STATUS_LABELS, DocumentStatus } from "@/hooks/useDocuments";

interface DocumentHistoryDialogProps {
  documentId: string;
  documentTitle: string;
}

const getStatusBadge = (status: DocumentStatus | null) => {
  if (!status) return null;
  
  const variants: Record<DocumentStatus, "default" | "secondary" | "destructive"> = {
    pending: "secondary",
    updated: "default",
    cancelled: "destructive",
  };
  
  return (
    <Badge variant={variants[status]}>
      {DOCUMENT_STATUS_LABELS[status]}
    </Badge>
  );
};

export function DocumentHistoryDialog({ documentId, documentTitle }: DocumentHistoryDialogProps) {
  const { data: history, isLoading } = useDocumentHistory(documentId);

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Ver histórico">
          <History className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Histórico de Alterações
          </DialogTitle>
          <p className="text-sm text-muted-foreground truncate">
            {documentTitle}
          </p>
        </DialogHeader>

        <ScrollArea className="h-[400px] pr-4">
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          ) : !history || history.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">Nenhuma alteração registrada</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((entry, index) => (
                <div
                  key={entry.id}
                  className={`relative pl-4 pb-4 ${
                    index < history.length - 1 ? "border-l-2 border-muted" : ""
                  }`}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full bg-primary" />
                  
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">
                        {entry.changed_by_name}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", {
                          locale: ptBR,
                        })}
                      </span>
                    </div>

                    {entry.change_type === "status_change" && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        {getStatusBadge(entry.previous_status)}
                        <span className="text-muted-foreground">→</span>
                        {getStatusBadge(entry.new_status)}
                      </div>
                    )}

                    {entry.change_type === "created" && (
                      <p className="text-sm text-muted-foreground">
                        Documento criado
                      </p>
                    )}

                    {entry.change_type === "edited" && (
                      <p className="text-sm text-muted-foreground">
                        Documento editado
                      </p>
                    )}

                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1 italic">
                        "{entry.notes}"
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
