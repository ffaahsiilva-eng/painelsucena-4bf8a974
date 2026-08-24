import { AlertTriangle, Check, X, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import {
  useExpiringDocuments,
  useUpdateDocument,
  Document,
  DOCUMENT_TYPE_LABELS,
} from "@/hooks/useDocuments";
import { getDaysUntilEventBrazilNorth } from "@/lib/timezone";

export function DocumentExpiryBanner() {
  const { data: expiringDocs, isLoading } = useExpiringDocuments(5);
  const updateDocument = useUpdateDocument();

  if (isLoading || !expiringDocs || expiringDocs.length === 0) {
    return null;
  }

  const handleUpdateStatus = async (doc: Document, status: "updated" | "cancelled") => {
    try {
      await updateDocument.mutateAsync({
        id: doc.id,
        status,
      });
      toast.success(
        status === "updated"
          ? "Documento marcado como atualizado"
          : "Documento cancelado"
      );
    } catch (error) {
      toast.error("Erro ao atualizar documento");
    }
  };

  return (
    <div className="mb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-red-500" />
          <h3 className="font-semibold text-lg expiry-neon-title">Documentos a Vencer</h3>
          <Badge variant="destructive" className="ml-2">
            {expiringDocs.length}
          </Badge>
        </div>
        <Link to="/documentos">
          <Button variant="ghost" size="sm">
            Ver todos
          </Button>
        </Link>
      </div>

      {/* Cards Scroll */}
      <ScrollArea className="w-full">
        <div className="flex gap-4 pb-4">
          {expiringDocs.map((doc) => {
            const daysUntil = getDaysUntilEventBrazilNorth(doc.expiry_date);
            const isUrgent = daysUntil <= 2;

            return (
              <Card
                key={doc.id}
                className="expiry-neon-card min-w-[280px] max-w-[320px] glass-card-dashboard"
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {DOCUMENT_TYPE_LABELS[doc.document_type]}
                      </p>
                    </div>
                    <AlertTriangle
                      className={`h-5 w-5 flex-shrink-0 ${
                        isUrgent ? "text-red-500 animate-pulse" : "text-orange-500"
                      }`}
                    />
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant={isUrgent ? "destructive" : "secondary"}>
                      {daysUntil === 0
                        ? "Vence hoje!"
                        : daysUntil === 1
                        ? "Vence amanhã"
                        : `${daysUntil} dias`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {format(new Date(doc.expiry_date + "T12:00:00"), "dd/MM/yyyy", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-green-600 hover:text-green-700 hover:bg-green-50"
                      onClick={() => handleUpdateStatus(doc, "updated")}
                      disabled={updateDocument.isPending}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Atualizado
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleUpdateStatus(doc, "cancelled")}
                      disabled={updateDocument.isPending}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>
    </div>
  );
}
